/**
 * npm run demo:check                 → the full demo session, live, 10 times, pass rate per step
 * npm run demo:check -- --runs 3     → fewer runs
 * npm run demo:check -- --variations → also re-phrased steps, 3 runs each
 *
 * One continuous session as Kilgore Trout, against the real model and the real pre-check.
 * Each run starts from "Reset demo", so it's exactly what you'll see on camera.
 */
import fs from "node:fs";
import { CATALOG } from "../data/catalog";
import { handleTurn } from "../lib/agent/loop";
import { resetDemo } from "../lib/demo-reset";
import type { StreamEvent, TraceEvent, UIEvent } from "../lib/types";

for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error("demo:check needs ANTHROPIC_API_KEY (in .env.local).");
  process.exit(1);
}
const arg = (name: string) => process.argv.includes(name);
const RUNS = Number(process.argv[process.argv.indexOf("--runs") + 1]) || 10;

interface Turn {
  text: string;
  ui: UIEvent[];
  trace: TraceEvent[];
  tools: { name: string; input: string; ok: boolean; output: string }[];
  done?: Extract<StreamEvent, { type: "done" }>;
  errors: string[];
}

async function say(sessionId: string, shopperId: string, message: string): Promise<Turn> {
  const events: StreamEvent[] = [];
  await handleTurn({ sessionId, shopperId, message }, (e) => events.push(e));
  const trace = events.flatMap((e) => (e.type === "trace" ? [e.event] : []));
  return {
    text: events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join(""),
    ui: events.flatMap((e) => (e.type === "ui" ? [e.event] : [])),
    trace,
    tools: trace.flatMap((t) => (t.type === "tool_call" ? [{ name: t.name, input: JSON.stringify(t.input), ok: t.ok, output: t.output }] : [])),
    done: events.find((e): e is Extract<StreamEvent, { type: "done" }> => e.type === "done"),
    errors: events.flatMap((e) => (e.type === "error" ? [e.message] : [])),
  };
}

// ─── The script ───────────────────────────────────────────────────────────────

type Check = (t: Turn, all: Turn[]) => string | true;
interface Step {
  id: string;
  act: 1 | 2;
  say: string;
  check: Check;
}

const used = (t: Turn, name: string, ok = true) => t.tools.some((x) => x.name === name && x.ok === ok);
const ui = (t: Turn, type: string, pred: (u: UIEvent) => boolean = () => true) => t.ui.some((u) => u.type === type && pred(u));
const catalogIds = new Set(CATALOG.map((b) => b.id));
const WAR = ["Slaughterhouse-Five", "Mother Night", "Armageddon in Retrospect"];

const STEPS: Step[] = [
  {
    id: "1. war book → asks which", act: 1, say: "Where's the Vonnegut book about the war?",
    check: (t) => {
      const named = WAR.filter((w) => t.text.includes(w));
      if (used(t, "find_on_shelf") || ui(t, "highlight_book")) return "acted on a guess (shelf lookup ran)";
      if (named.length < 2) return `named ${named.length} of the 3`;
      return /\?/.test(t.text) ? true : "didn't ask";
    },
  },
  {
    id: "2. Slaughterhouse-Five → shelf", act: 1, say: "Slaughterhouse-Five",
    check: (t) => (ui(t, "highlight_book", (u) => (u as { bookId: string }).bookId === "kv-slaughterhouse-five") ? true : `no highlight; tools=${t.tools.map((x) => `${x.name}:${x.ok}`)}`),
  },
  {
    id: "3. read next → catalog recs", act: 1, say: "What should I read next?",
    check: (t) => {
      if (!used(t, "recommend") && !used(t, "search_catalog")) return `no catalog tool; asked instead: "${t.text.slice(0, 90)}"`;
      const ids = t.ui.flatMap((u) => (u.type === "book_cards" ? u.books.map((b) => b.id) : []));
      if (!ids.length) return "no book cards";
      return ids.every((i) => catalogIds.has(i)) ? true : "a non-catalog book was shown";
    },
  },
  {
    id: "4. Solaris → not stocked, offer", act: 1, say: "Do you have Solaris?",
    check: (t) => {
      if (!used(t, "search_open_library")) return "no Open Library check";
      if (!ui(t, "external_books", (u) => JSON.stringify(u).includes("Solaris"))) return "no Solaris card";
      if (/\$\d/.test(t.text)) return "quoted a price";
      return /request|list/i.test(t.text) ? true : `no offer to request: "${t.text.slice(0, 90)}"`;
    },
  },
  {
    id: "5. yes → request added", act: 1, say: "Yes",
    check: (t) => (used(t, "add_to_reader_requests") && ui(t, "wanted_list_updated") ? true : `tools=${t.tools.map((x) => `${x.name}:${x.ok}`)}`),
  },
  {
    id: "6. return opener → asks order + email", act: 2, say: "While I'm here, I bought a book on Bookly last week and want to return it.",
    check: (t) => {
      if (t.tools.some((x) => ["initiate_return", "check_return_eligibility"].includes(x.name))) return "acted before having the order";
      return /order/i.test(t.text) && /email/i.test(t.text) ? true : `didn't ask for both: "${t.text.slice(0, 90)}"`;
    },
  },
  {
    id: "7. BK-1042 → eligible, preview", act: 2, say: "BK-1042, kilgore.trout@example.com",
    check: (t) => {
      if (!used(t, "lookup_order")) return "no lookup";
      if (!ui(t, "order_card", (u) => (u as { order: { purchasedAt: string } }).order.purchasedAt === "bookly.com")) return "no order card showing bookly.com";
      if (!t.tools.some((x) => x.name === "check_return_eligibility" && x.output.includes('"return_eligible":true'))) return "no eligibility check";
      return ui(t, "confirmation", (u) => (u as { kind: string; stage: string }).kind === "return" && (u as { stage: string }).stage === "preview") ? true : `no preview; asked: "${t.text.slice(0, 90)}"`;
    },
  },
  {
    id: "8. yes → return created", act: 2, say: "Yes",
    check: (t) => (ui(t, "confirmation", (u) => (u as { kind: string; stage: string }).kind === "return" && (u as { stage: string }).stage === "done") ? true : `no return; tools=${t.tools.map((x) => `${x.name}:${x.ok}`)}`),
  },
  {
    id: "9. Rosewater → kind no", act: 2, say: "And God Bless You, Mr. Rosewater, from last month?",
    check: (t) => {
      if (!t.tools.some((x) => x.name === "check_return_eligibility" && x.input.includes("0977") && x.output.includes('"return_eligible":false'))) return `no eligibility check on BK-0977; tools=${t.tools.map((x) => `${x.name}:${x.ok}`)}`;
      if (ui(t, "confirmation", (u) => (u as { stage: string }).stage === "done")) return "a return was created";
      if (!/30/.test(t.text)) return "didn't cite the 30-day policy";
      if (!t.trace.some((x) => x.type === "guardrail" && x.rule === "handoff_offered")) return "no handoff offer recorded";
      return /bring|person|colleague|someone|team/i.test(t.text) ? true : "reply doesn't offer a person";
    },
  },
  {
    id: "10. yes, please → handoff", act: 2, say: "Yes, please",
    check: (t, all) => {
      const h = t.ui.find((u) => u.type === "handoff") as { summary: string } | undefined;
      if (!h) return "no handoff card";
      if (!h.summary.includes("Breakfast of Champions")) return "summary misses the return";
      if (all.some((x) => x.ui.some((u) => u.type === "wanted_list_updated")) && !h.summary.includes("Solaris")) return "summary misses the Solaris request";
      return t.done?.locked ? true : "session not locked";
    },
  },
];

// ─── Variations (re-phrased steps, run within their act) ─────────────────────

const VARIATIONS: { step: string; say: string }[] = [
  { step: "1. war book → asks which", say: "the war one by Vonnegut" },
  { step: "1. war book → asks which", say: "Which Vonnegut book is about the war?" },
  { step: "3. read next → catalog recs", say: "Any recommendations after that?" },
  { step: "4. Solaris → not stocked, offer", say: "Is Solaris by Stanisław Lem in stock?" },
  { step: "6. return opener → asks order + email", say: "I want to send back a book I got on bookly.com" },
  { step: "9. Rosewater → kind no", say: "What about the Rosewater book I bought last month?" },
  { step: "10. yes, please → handoff", say: "Sure" },
  { step: "10. yes, please → handoff", say: "ok" },
  { step: "10. yes, please → handoff", say: "Can I talk to a person?" },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

let seq = 0;
async function runScript(steps: Step[]): Promise<{ results: Record<string, string | true>; turns: number }> {
  const n = ++seq;
  const shopperId = `democheck${n}x${Date.now().toString(36)}`;
  const sessionId = `${shopperId}s`;
  resetDemo(shopperId);
  const results: Record<string, string | true> = {};
  const all: Turn[] = [];
  let lastTurn = 0;
  for (const step of steps) {
    let t: Turn;
    try {
      t = await say(sessionId, shopperId, step.say);
    } catch (err) {
      results[step.id] = `threw: ${err instanceof Error ? err.message : err}`;
      continue;
    }
    all.push(t);
    lastTurn = t.done?.turn ?? lastTurn;
    if (t.errors.length) results[step.id] = `error: ${t.errors[0]}`;
    else if (t.done?.locked && !step.id.startsWith("10")) results[step.id] = "session locked early";
    else results[step.id] = step.check(t, all);
  }
  return { results, turns: lastTurn };
}

function report(title: string, runs: Awaited<ReturnType<typeof runScript>>[], steps: Step[]) {
  console.log(`\n${title}`);
  const w = Math.max(...steps.map((s) => s.id.length));
  for (const s of steps) {
    const rs = runs.map((r) => r.results[s.id]).filter((r) => r !== undefined);
    const pass = rs.filter((r) => r === true).length;
    const fails = [...new Set(rs.filter((r) => r !== true) as string[])].slice(0, 2);
    console.log(`${s.id.padEnd(w + 2)}${String(pass).padStart(2)}/${rs.length}${fails.length ? `   ✗ ${fails.join(" | ")}` : ""}`);
  }
  console.log(`turns used per run: ${runs.map((r) => r.turns).join(", ")} (limit 12)`);
}

async function main() {
  const t0 = Date.now();
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    runs.push(await runScript(STEPS));
    process.stdout.write(Object.values(runs[i].results).every((r) => r === true) ? "." : "F");
  }
  report(`Demo session × ${RUNS}`, runs, STEPS);
  if (arg("--variations")) {
    for (const v of VARIATIONS) {
      const target = STEPS.find((s) => s.id === v.step)!;
      const act = STEPS.filter((s) => s.act === target.act).map((s) => (s.id === v.step ? { ...s, say: v.say } : s));
      const vr = [];
      for (let i = 0; i < 3; i++) vr.push(await runScript(act));
      const r = vr.map((x) => x.results[v.step]);
      const pass = r.filter((x) => x === true).length;
      const restOk = vr.every((x) => Object.entries(x.results).every(([k, val]) => k === v.step || val === true));
      console.log(`variation "${v.say}" → ${v.step}: ${pass}/3${r.some((x) => x !== true) ? `   ✗ ${[...new Set(r.filter((x) => x !== true))].join(" | ")}` : ""}${restOk ? "" : "   (another step in the act failed)"}`);
    }
  }
  console.log(`\n${((Date.now() - t0) / 60000).toFixed(1)} min`);
  const allPass = runs.every((r) => Object.values(r.results).every((x) => x === true));
  process.exit(allPass ? 0 : 1);
}

main();
