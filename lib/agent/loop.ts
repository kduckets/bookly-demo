import Anthropic from "@anthropic-ai/sdk";
import type { StreamEvent, TraceEvent, UIEvent } from "@/lib/types";
import {
  LIMITS,
  checkRateLimit,
  clampTurnLimit,
  runPrecheck,
  sanitizePersona,
  type Precheck,
} from "./guardrails";
import { DEFAULT_PERSONA, buildSystemPrompt, sessionContext } from "./prompts";
import { createSession, getSession, type Session } from "./session";
import { missingSlots, type Intent } from "./slots";
import { TOOL_DEFINITIONS, executeTool } from "./tools";
import { openTicket, summaryFromSession } from "./tools/escalation";
import { resolveFromCustomer } from "./gate";
import { activeProcedure, changedProceduresBlock, getProcedure, proceduresBlock, procedureSnapshot } from "./procedures";
import { buildFacts, checkReply, regenerationNote, sanitize, type CheckResult } from "./output-check";

/**
 * Bookly's agent, hand-written against the Messages API. One customer message = one turn:
 *
 *   1. Load the session (history, turn count, slots, verified orders).
 *   2. Enforce limits server-side (length, rate, turn limit).
 *   3. Pre-check scope with a cheap model; handle handoffs and off-topic without the main agent.
 *   4. Call Claude with the layered prompt and tool definitions.
 *   5. While Claude asks for tools: validate, execute against mock data, append results, loop (max 5).
 *   6. Check the reply: every price, ID, availability and policy claim must be grounded in tool results.
 *   7. Stream text, UI events, and trace events to the client.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.ANTHROPIC_EFFORT || "low") as "low" | "medium" | "high";
/** Models that accept {role: "system"} messages mid-conversation. */
const SUPPORTS_SYSTEM_MESSAGES = /claude-(opus-5|opus-4-8|fable-5|mythos-5|sonnet-5-5|haiku-5-5)/.test(MODEL);
/** Models that support server-side refusal fallbacks. */
const SUPPORTS_FALLBACKS = /claude-(opus-5|fable-5|sonnet-5-5)/.test(MODEL) && process.env.BOOKLY_FALLBACKS !== "off";

export interface TurnInput {
  sessionId: string;
  shopperId: string;
  message: string;
  persona?: string;
  turnLimit?: number;
}

export type Emit = (event: StreamEvent) => void;

let client: Anthropic | null = null;

/** Evals inject a scripted stand-in for the Messages API to test the loop deterministically. */
export function setClientForTests(fake: unknown) {
  client = fake as Anthropic;
}

export const AGENT_MODEL = MODEL;

// ─── One turn ─────────────────────────────────────────────────────────────────

export async function handleTurn(input: TurnInput, emit: Emit): Promise<void> {
  const started = Date.now();
  const ui = (event: UIEvent) => emit({ type: "ui", event });
  const trace = (event: TraceEvent) => emit({ type: "trace", event });
  const persona = sanitizePersona(input.persona, DEFAULT_PERSONA);

  // 1. Load session
  const s = getSession(input.sessionId) ?? createSession({
    id: input.sessionId,
    shopperId: input.shopperId,
    systemPrompt: buildSystemPrompt(persona, proceduresBlock(input.shopperId)),
    personaHash: hash(persona),
    procedureVersions: procedureSnapshot(input.shopperId),
    turnLimit: clampTurnLimit(input.turnLimit),
  });

  // 2. Limits, enforced here rather than trusted from the client
  if (s.locked) {
    emit({ type: "text", delta: "This conversation has been handed to a human colleague. Start a new conversation if you'd like to keep browsing with me." });
    ui({ type: "session_locked", reason: s.lockReason ?? "handoff" });
    return done(emit, s);
  }
  const message = input.message.trim();
  if (!message) return done(emit, s);
  if (message.length > LIMITS.maxMessageChars) {
    emit({ type: "error", message: `Messages are limited to ${LIMITS.maxMessageChars} characters.` });
    return done(emit, s);
  }
  if (!checkRateLimit(s)) {
    trace({ type: "guardrail", rule: "rate_limit", detail: `${LIMITS.rateLimitMax} messages per minute` });
    emit({ type: "error", message: "Easy there. Give me a moment to catch up, then try again." });
    return done(emit, s);
  }
  s.turnLimit = clampTurnLimit(input.turnLimit ?? s.turnLimit);
  s.turn += 1;

  // 3. Scope pre-check, slot tracking, and handoff triggers
  const lastAssistant = [...s.transcript].reverse().find((t) => t.role === "assistant")?.text ?? "";
  const { result: pre, ms } = await runPrecheck({ message, lastAssistant, activeIntent: s.activeIntent, persona });
  trace({ type: "precheck", label: pre.label, intent: pre.intent, frustrated: pre.frustrated, wantsHuman: pre.wantsHuman, source: pre.source, ms });
  updateSlots(s, pre);
  // Settle any book or order the customer named or picked, before the model acts.
  const picked = resolveFromCustomer(s, message);
  if (picked.length) trace({ type: "guardrail", rule: "disambiguation_pick", detail: `customer settled on: ${picked.join(", ")}` });
  trace({ type: "slots", intent: s.activeIntent ?? "none", collected: s.slots, missing: missingSlots(s.activeIntent, s.slots) });
  s.transcript.push({ role: "user", text: message });

  if (pre.wantsHuman) return forcedHandoff(s, message, "Customer asked for a human", emit, started);
  if (pre.frustrated || pre.label === "abusive") s.frustrationCount += 1;
  if (s.frustrationCount >= LIMITS.frustrationThreshold)
    return forcedHandoff(s, message, "Customer frustrated on repeated messages", emit, started);

  if (pre.label === "off_topic") {
    const reply = pre.redirect || "That one's outside my shelves, I'm afraid. I'm a bookstore clerk. Ask me about books, though, and I'll talk your ear off.";
    trace({ type: "guardrail", rule: "off_topic_redirect", detail: "Answered without running the main agent" });
    emit({ type: "text", delta: reply });
    commit(s, [...userMessage(message, null), { role: "assistant", content: reply }], reply);
    return finishTurn(s, emit, started, { iterations: 0, input: 0, output: 0, cacheRead: 0 });
  }

  // 4–6. The agent loop
  const personaChanged = hash(persona) !== s.personaHash ? persona : undefined;
  if (personaChanged) s.personaHash = hash(persona);
  // Procedure edits made mid-conversation ride in this turn's context message (append-only history).
  const proceduresChanged = changedProceduresBlock(s.shopperId, s.procedureVersions);
  if (proceduresChanged) s.procedureVersions = procedureSnapshot(s.shopperId);
  const context = sessionContext(s, pre, { personaChanged, proceduresChanged });
  let usage;
  try {
    usage = await agentLoop(s, message, context, emit);
    traceProcedure(s, usage.tools, emit);
  } catch (err) {
    s.turn -= 1; // a failed call shouldn't cost the customer a turn
    s.transcript.pop();
    emit({ type: "error", message: describeError(err) });
    return done(emit, s);
  }

  // Post-turn handoff triggers: repeated failure, then turn limit
  const looping = Object.entries(s.failures).find(([, n]) => n >= LIMITS.failureThreshold);
  if (looping && !s.locked) {
    s.failures[looping[0]] = 0;
    return forcedHandoff(s, null, `Repeated failure: ${looping[0].replace("_", " ")}`, emit, started, usage);
  }
  if (s.turn >= s.turnLimit) return forcedHandoff(s, null, "Conversation reached its turn limit", emit, started, usage);
  return finishTurn(s, emit, started, usage);
}

// ─── The tool-use loop ────────────────────────────────────────────────────────

async function agentLoop(s: Session, message: string, context: string, emit: Emit) {
  client ??= new Anthropic();
  let turn: Anthropic.Beta.BetaMessageParam[] = userMessage(message, context);
  const usage = { iterations: 0, input: 0, output: 0, cacheRead: 0, tools: [] as string[] };
  const earlierText: string[] = []; // text written alongside tool calls this turn
  let finalText = "";
  let jsonRetries = 0;
  let regenerated = false;
  let cap = LIMITS.maxToolIterations;

  for (let i = 0; i <= cap; i++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: s.systemPrompt, cache_control: { type: "ephemeral" } }],
      tools: TOOL_DEFINITIONS,
      // After the iteration cap, Claude must answer with what it has.
      tool_choice: i === cap ? { type: "none" } : { type: "auto" },
      messages: [...s.history, ...turn],
      output_config: { effort: EFFORT },
      ...(SUPPORTS_FALLBACKS ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    // Text is buffered, not streamed: the output check must see the whole reply first.
    let text = "";
    stream.on("text", (delta) => {
      text += delta;
    });

    let msg: Anthropic.Beta.BetaMessage;
    try {
      msg = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Only a malformed tool-input stream is retried; API errors propagate.
      if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
      i--;
      continue;
    }
    usage.iterations++;
    usage.input += msg.usage.input_tokens + (msg.usage.cache_creation_input_tokens ?? 0) + (msg.usage.cache_read_input_tokens ?? 0);
    usage.output += msg.usage.output_tokens;
    usage.cacheRead += msg.usage.cache_read_input_tokens ?? 0;

    if (msg.stop_reason === "refusal") {
      const reply = "I can't help with that one. I'm happy to help with books, orders, or anything else in the shop.";
      emit({ type: "text", delta: reply });
      commit(s, [...userMessage(message, context), { role: "assistant", content: reply }], reply);
      return usage;
    }

    if (msg.stop_reason !== "tool_use") {
      // A tool call cut off by max_tokens is incomplete; never run it or keep it in history.
      const final: Anthropic.Beta.BetaMessageParam = { role: "assistant", content: msg.content.filter((b) => b.type !== "tool_use") };
      finalText = [...earlierText, text].filter(Boolean).join("\n\n");

      // Output check: every price, ID, availability and policy claim must be grounded.
      const facts = buildFacts([...s.history, ...turn], s.transcript.filter((t) => t.role === "user").map((t) => t.text));
      const result = checkReply(finalText, facts);
      if (result.passed) {
        emitCheck(emit, result, regenerated, false);
        turn.push(final);
        break;
      }
      if (!regenerated) {
        // First failure: drop the draft and try once more with a note listing what was unsupported.
        emitCheck(emit, result, false, false);
        regenerated = true;
        turn = withNote(turn, regenerationNote(result));
        cap = i + 2; // room for one tool round, then an answer
        continue;
      }
      // Second failure: remove the unsupported sentences and count it toward escalation.
      finalText = sanitize(finalText, result);
      emitCheck(emit, result, true, true);
      s.failures.grounding = (s.failures.grounding ?? 0) + 1;
      turn.push({ role: "assistant", content: [{ type: "text", text: finalText }] });
      break;
    }

    if (text) earlierText.push(text);
    turn.push({ role: "assistant", content: msg.content });
    const toolUses = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    usage.tools.push(...toolUses.map((t) => t.name));

    // Execute every requested tool, then return all results in one user message.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of toolUses) {
      const t0 = Date.now();
      const outcome = await executeTool(call.name, call.input, {
        session: s,
        emitUI: (event) => emit({ type: "ui", event }),
        emitTrace: (event) => emit({ type: "trace", event }),
      });
      const output = JSON.stringify(outcome.data);
      emit({ type: "trace", event: { type: "tool_call", name: call.name, input: call.input, output: truncate(output, 600), ok: outcome.ok, ms: Date.now() - t0 } });
      if (outcome.failureKey) s.failures[outcome.failureKey] = (s.failures[outcome.failureKey] ?? 0) + 1;
      results.push({ type: "tool_result", tool_use_id: call.id, content: output, ...(outcome.ok ? {} : { is_error: true }) });
    }
    turn.push({ role: "user", content: results });
  }

  if (finalText) emit({ type: "text", delta: finalText });
  commit(s, turn, finalText);
  return usage;
}

/** Record which procedure (and which version of it) governed this turn. */
function traceProcedure(s: Session, toolsUsed: string[], emit: Emit) {
  const id = activeProcedure(s.activeIntent, toolsUsed);
  if (!id) return;
  const p = getProcedure(s.shopperId, id);
  emit({ type: "trace", event: { type: "procedure", id, title: p.title, version: p.version, edited: !p.isDefault } });
}

function emitCheck(emit: Emit, result: CheckResult, regenerated: boolean, sanitized: boolean) {
  emit({
    type: "trace",
    event: {
      type: "output_check",
      passed: result.passed,
      regenerated,
      sanitized,
      claims: result.claims.map((c) => ({ kind: c.kind, text: c.text.slice(0, 120), ok: c.ok, reason: c.reason })),
    },
  });
}

/**
 * Add the regeneration note to this turn's (uncommitted) messages. A system message must follow a
 * user message, so: after tool results, append one; if the turn ends with this turn's context
 * message, extend it; on models without system messages, add a text block to the last user message.
 */
function withNote(turn: Anthropic.Beta.BetaMessageParam[], note: string): Anthropic.Beta.BetaMessageParam[] {
  const out = turn.slice();
  const last = out[out.length - 1];
  if (SUPPORTS_SYSTEM_MESSAGES) {
    if (last.role === "system") out[out.length - 1] = { role: "system", content: `${last.content}\n\n${note}` };
    else out.push({ role: "system", content: note });
    return out;
  }
  const blocks = typeof last.content === "string" ? [{ type: "text" as const, text: last.content }] : [...(last.content as Anthropic.Beta.BetaContentBlockParam[])];
  out[out.length - 1] = { role: "user", content: [...blocks, { type: "text", text: `<output_check>${note}</output_check>` }] } as Anthropic.Beta.BetaMessageParam;
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The customer's message, followed by this turn's session context. The context rides in a
 * mid-conversation system message so the top-level system prompt stays byte-identical all
 * session long (prompt cache hits, and thinking blocks stay valid). History is append-only.
 */
function userMessage(text: string, context: string | null): Anthropic.Beta.BetaMessageParam[] {
  if (!context) return [{ role: "user", content: text }];
  if (SUPPORTS_SYSTEM_MESSAGES) return [{ role: "user", content: text }, { role: "system", content: context }];
  return [{ role: "user", content: [{ type: "text", text: context }, { type: "text", text }] }];
}

function commit(s: Session, messages: Anthropic.Beta.BetaMessageParam[], assistantText: string) {
  s.history.push(...messages);
  if (assistantText) s.transcript.push({ role: "assistant", text: assistantText });
}

function updateSlots(s: Session, pre: Precheck) {
  const keep: Intent[] = ["other", "discuss_book", "human"];
  if (!keep.includes(pre.intent)) s.activeIntent = pre.intent;
  else if (!s.activeIntent && pre.intent === "discuss_book") s.activeIntent = pre.intent;
  for (const [k, v] of Object.entries(pre.slots)) s.slots[k] = v;
}

/** Deterministic handoff: open a ticket from session state and stop taking requests. */
function forcedHandoff(
  s: Session,
  message: string | null,
  reason: string,
  emit: Emit,
  started: number,
  usage = { iterations: 0, input: 0, output: 0, cacheRead: 0 },
) {
  const already = !!s.ticketId;
  const ticket = openTicket({ session: s, emitUI: (event) => emit({ type: "ui", event }) }, reason, summaryFromSession(s, reason));
  emit({ type: "trace", event: { type: "guardrail", rule: "handoff", detail: reason } });
  const text = message
    ? `Of course. I'm bringing in a human colleague now. I've passed along everything we've covered, so you won't have to repeat yourself. Your ticket is ${ticket.ticket_id}.`
    : `${already ? "" : "\n\n"}We've covered a lot of ground, and I want to make sure you're well looked after. I've handed this conversation to a human colleague with a summary (ticket ${ticket.ticket_id}). You can also start a new conversation with me any time.`;
  emit({ type: "text", delta: text });
  if (message) commit(s, [userMessage(message, null)[0], { role: "assistant", content: text }], text);
  else s.transcript.push({ role: "assistant", text });
  s.locked = true;
  s.lockReason = reason;
  emit({ type: "ui", event: { type: "session_locked", reason } });
  return finishTurn(s, emit, started, usage);
}

function finishTurn(s: Session, emit: Emit, started: number, u: { iterations: number; input: number; output: number; cacheRead: number }) {
  emit({
    type: "trace",
    event: { type: "turn", turn: s.turn, limit: s.turnLimit, iterations: u.iterations, model: MODEL, inputTokens: u.input, outputTokens: u.output, cacheReadTokens: u.cacheRead, ms: Date.now() - started },
  });
  return done(emit, s);
}

function done(emit: Emit, s: Session) {
  emit({ type: "done", turn: s.turn, limit: s.turnLimit, locked: s.locked });
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The clerk can't reach the model: check ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "The clerk is swamped (rate limited). Try again in a moment.";
  if (err instanceof Anthropic.APIError) return `The model returned an error (${err.status ?? "network"}). Try again.`;
  if (err instanceof Error && /api ?key|apiKey|authToken/i.test(err.message)) return "The clerk can't reach the model: set ANTHROPIC_API_KEY (in .env.local locally, or in the Vercel project settings).";
  console.error("[agent]", err);
  return "Something went wrong behind the counter. Try again.";
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
