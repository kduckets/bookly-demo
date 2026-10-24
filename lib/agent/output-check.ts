import { CATALOG } from "@/data/catalog";
import { POLICIES, POLICY_NUMBERS } from "@/data/policies";
import type { Book } from "@/lib/types";

/**
 * Output-side grounding check. Before a reply reaches the customer, every structured fact in it
 * (prices, order and reference IDs, availability, policy numbers) must appear in a tool result,
 * in the store's policy data, or in something the customer said. Pure and synchronous: plain
 * parsing, no model call. Free-form literary discussion is deliberately not checked.
 */

export type ClaimKind = "price" | "order_id" | "reference" | "availability" | "policy_days" | "recommendation";

export interface Claim {
  kind: ClaimKind;
  /** The text that made the claim, as it appears in the reply. */
  text: string;
  ok: boolean;
  reason?: string;
  /** Index of the sentence that contains it (for sanitizing). */
  sentence: number;
}

export interface CheckResult {
  passed: boolean;
  claims: Claim[];
}

/** Everything a reply may legitimately cite. Built from the session's messages. */
export interface GroundingFacts {
  /** Numbers found in tool results and customer messages, normalized to 2 decimals. */
  numbers: Set<string>;
  /** Upper-cased text of all tool results and customer messages, for ID lookups. */
  corpus: string;
  /** Catalog book IDs that appeared in tool results. */
  seenBookIds: Set<string>;
  /** Normalized titles from Open Library results that Bookly does not sell. */
  externalTitles: Set<string>;
  /** True when the customer asked for a recommendation: suggested books must come from a lookup. */
  recommending: boolean;
}

export const FALLBACK = "Let me double-check that for you. I can look it up again, or bring in a human colleague if you'd prefer.";

// ─── Facts ────────────────────────────────────────────────────────────────────

const num = (s: string) => Number(s.replace(/,/g, "")).toFixed(2);
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Minimal message shape, so this module doesn't depend on the SDK. */
type Msg = { role: string; content?: unknown };

export function buildFacts(messages: Msg[], customerTexts: string[], opts: { recommending?: boolean } = {}): GroundingFacts {
  const toolTexts: string[] = [];
  for (const m of messages) {
    if (m.role !== "user" || !Array.isArray(m.content)) continue;
    for (const b of m.content as { type?: string; content?: unknown }[]) {
      if (b?.type === "tool_result" && typeof b.content === "string") toolTexts.push(b.content);
    }
  }
  const all = [...toolTexts, ...customerTexts].join("\n");
  const numbers = new Set<string>();
  for (const m of all.matchAll(/\d[\d,]*(?:\.\d+)?/g)) numbers.add(num(m[0]));

  const seenBookIds = new Set<string>();
  const externalTitles = new Set<string>();
  const tools = toolTexts.join("\n");
  for (const b of CATALOG) if (tools.includes(`"${b.id}"`)) seenBookIds.add(b.id);
  for (const m of tools.matchAll(/"title":"((?:[^"\\]|\\.)*)"[^{}]*?"sold_by_bookly":false/g)) externalTitles.add(norm(m[1]));

  // Books the customer named themselves count as looked up: talking about them is fine.
  for (const b of CATALOG) if (customerTexts.some((t) => t.toLowerCase().includes(b.title.toLowerCase()))) seenBookIds.add(b.id);
  return { numbers, corpus: all.toUpperCase(), seenBookIds, externalTitles, recommending: !!opts.recommending };
}

// ─── Claims ───────────────────────────────────────────────────────────────────

/** Allowed day and business-day numbers per policy topic, read from the policy data. */
const TOPIC_NUMBERS: { topic: RegExp; numbers: Set<string> }[] = [
  { topic: /\b(return|returns|returned|returnable)\b/i, numbers: numbersIn(POLICIES.returns.text, String(POLICY_NUMBERS.returnWindowDays)) },
  { topic: /\b(refund|refunds|refunded)\b/i, numbers: numbersIn(POLICIES.refunds.text) },
  { topic: /\b(exchange|exchanges|exchanged|swap)\b/i, numbers: numbersIn(POLICIES.exchanges.text, String(POLICY_NUMBERS.exchangeWindowDays)) },
  { topic: /\b(ship|shipping|shipped|deliver|delivery|arrive|arrives|expedited|standard)\b/i, numbers: numbersIn(POLICIES.shipping.text) },
];
const ALL_POLICY_NUMBERS = numbersIn(Object.values(POLICIES).map((p) => p.text).join(" "), ...Object.values(POLICY_NUMBERS).map(String));

function numbersIn(text: string, ...extra: string[]): Set<string> {
  const s = new Set(extra.map(num));
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) s.add(num(m[0]));
  return s;
}

/** Split into sentences, keeping line breaks so the reply can be reassembled. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])[ \t]+|(?=\n)/).filter((s) => s.length > 0);
}

const NEGATION = /\b(not|no longer|don't|doesn't|isn't|aren't|can't|cannot|haven't|won't|sold out|out of stock|unavailable|yet to)\b|n't\b/i;
const POSITIVE_STOCK = /\b(in stock|we have|we've got|we carry|we stock|available|on (our|the) shel(f|ves)|copies left|ready to ship)\b/i;
const COUNT_COPIES = /\b(\d+)\s+(?:print\s+)?cop(?:y|ies)\b/i;

/** Titles mentioned in a sentence. Short titles ("Code", "Dune") must match case exactly. */
function titlesIn(sentence: string): Book[] {
  const lower = ` ${norm(sentence)} `;
  return CATALOG.filter((b) => {
    const t = norm(b.title);
    if (t.length < 6) return new RegExp(`\\b${b.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(sentence);
    return lower.includes(` ${t} `);
  });
}

export function checkReply(text: string, facts: GroundingFacts): CheckResult {
  const claims: Claim[] = [];
  const sentences = splitSentences(text);

  sentences.forEach((sentence, i) => {
    const add = (kind: ClaimKind, t: string, ok: boolean, reason?: string) => claims.push({ kind, text: t.trim(), ok, reason: ok ? undefined : reason, sentence: i });

    // Prices: "$12.99", "12.99 dollars"
    for (const m of sentence.matchAll(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:dollars|USD)\b/gi)) {
      const v = num(m[1] ?? m[2]);
      add("price", m[0], facts.numbers.has(v) || ALL_POLICY_NUMBERS.has(v), `$${v} doesn't appear in any tool result or policy`);
    }

    // Order IDs, and references we issue (tickets, gift cards, returns, exchanges)
    for (const m of sentence.matchAll(/\bBK-\d{3,5}\b/gi)) {
      add("order_id", m[0], facts.corpus.includes(m[0].toUpperCase()), `${m[0]} was never returned by a tool or given by the customer`);
    }
    for (const m of sentence.matchAll(/\b(?:BKLY|GC|RMA|EXC)-[A-Z0-9]{5}\b/g)) {
      add("reference", m[0], facts.corpus.includes(m[0]), `${m[0]} was never returned by a tool`);
    }

    // Availability tied to a specific title
    const positive = POSITIVE_STOCK.test(sentence);
    const negative = NEGATION.test(sentence);
    if (positive || negative) {
      for (const ext of facts.externalTitles) {
        if (ext.length >= 4 && ` ${norm(sentence)} `.includes(` ${ext} `) && positive && !negative) {
          add("availability", sentence, false, `Says we carry "${ext}", but Open Library marked it as not sold by Bookly`);
        }
      }
      for (const b of titlesIn(sentence)) {
        const seen = facts.seenBookIds.has(b.id);
        const count = sentence.match(COUNT_COPIES);
        if (count) {
          add("availability", `${count[0]} of ${b.title}`, seen && Number(count[1]) === b.stock, `Copy count for ${b.title} doesn't match the tool result (${b.stock})`);
        } else if (positive && !negative) {
          const ok = seen && (b.stock > 0 || /ebook/i.test(sentence));
          add("availability", `${b.title}: available`, ok, seen ? `${b.title} print copies are sold out` : `${b.title}'s stock wasn't checked with a tool this conversation`);
        } else if (negative && /\b(carry|stock|have)\b/i.test(sentence) && !/\b(print|hardcover|paperback|ebook|format)\b/i.test(sentence)) {
          add("availability", `${b.title}: not carried`, !(b.stock > 0), `Says we don't have ${b.title}, but it's in the catalog and in stock`);
        }
      }
    }

    // Recommendations: when the customer asked what to read, every catalog book suggested must
    // have come from recommend or search_catalog, not from the model's own memory.
    if (facts.recommending) {
      for (const b of titlesIn(sentence)) {
        if (!facts.seenBookIds.has(b.id)) add("recommendation", b.title, false, `suggested ${b.title} without looking it up; call recommend (or search_catalog) and suggest from the results`);
      }
    }

    // Policy numbers: "30 days", "30-day", "5–7 business days". "N days ago" is an order fact, not policy.
    for (const m of sentence.matchAll(/\b(\d+)(?:\s*(?:–|-|to)\s*(\d+))?[\s-]*(?:business[\s-])?days?\b(\s+ago)?/gi)) {
      const values = [m[1], m[2]].filter(Boolean).map((v) => num(v!));
      if (m[3]) {
        add("policy_days", m[0], values.every((v) => facts.numbers.has(v)), `"${m[0].trim()}" doesn't match the order data`);
        continue;
      }
      const topics = TOPIC_NUMBERS.filter((t) => t.topic.test(sentence));
      const allowed = topics.length ? new Set(topics.flatMap((t) => [...t.numbers])) : new Set([...ALL_POLICY_NUMBERS, ...facts.numbers]);
      add("policy_days", m[0], values.every((v) => allowed.has(v)), `"${m[0].trim()}" isn't what the ${topics.length ? "policy" : "store data"} says`);
    }
  });

  return { passed: claims.every((c) => c.ok), claims };
}

/** Second failure: drop sentences with unsupported claims and add one safe fallback line. */
export function sanitize(text: string, result: CheckResult): string {
  const bad = new Set(result.claims.filter((c) => !c.ok).map((c) => c.sentence));
  if (!bad.size) return text;
  const kept = splitSentences(text)
    .filter((_, i) => !bad.has(i))
    .join(" ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return kept ? `${kept}\n\n${FALLBACK}` : FALLBACK;
}

/** The note added before the one regeneration. */
export function regenerationNote(result: CheckResult): string {
  const list = result.claims
    .filter((c) => !c.ok)
    .map((c) => `- ${c.text}: ${c.reason}`)
    .join("\n");
  return `Output check: your draft reply stated facts that no tool result supports:\n${list}\nRewrite the reply. State prices, order or reference IDs, availability, and policy numbers only as they appear in tool results or get_policy, or call the right tool first. Do not mention this check to the customer.`;
}
