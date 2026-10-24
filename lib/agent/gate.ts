import { getBook } from "@/data/catalog";
import { allOrders } from "@/data/orders";
import type { Book, Order } from "@/lib/types";
import { candidate, titlesIn, type Candidate, type Verdict } from "./match";
import type { Session } from "./session";
import type { ToolContext, ToolOutcome } from "./tools/types";
import { normalize, normalizeOrderId, resolveBook } from "./tools/util";

/**
 * The disambiguation gate. The model decides how to ask; code guarantees it can't act on a guess.
 * Tools that act on one specific book or order only accept ids the customer has settled on:
 *   - a book is resolved by an exact search verdict, by the customer naming its title, or by
 *     picking it from a list we showed ("the second one", "the Le Guin one");
 *   - an order is resolved by order number + email, by being the customer's only order, by being
 *     the only one eligible for what they asked, or by the customer picking it.
 */

const GATED: Record<string, { books?: string[]; orders?: string[] }> = {
  find_on_shelf: { books: ["book_id"] },
  add_to_cart: { books: ["book_id"] },
  initiate_exchange: { books: ["new_book_id"], orders: ["order_id"] },
  check_return_eligibility: { orders: ["order_id"] },
  initiate_return: { orders: ["order_id"] },
};

const add = (list: string[], id: string) => {
  if (!list.includes(id)) list.push(id);
};

// ─── Recording what the customer has seen and settled on ─────────────────────

export function recordVerdict(ctx: Pick<ToolContext, "session" | "emitTrace">, v: Verdict) {
  const s = ctx.session;
  if (v.match === "exact" && v.resolved_id) add(s.resolvedBooks, v.resolved_id);
  else if (v.candidates?.length) s.pendingBooks = v.candidates;
  ctx.emitTrace({ type: "match", verdict: v.match, resolved: v.resolved_id, candidates: v.candidates?.map((c) => c.title) ?? [], reason: v.reason });
}

/** A list we showed (recommendations, related books) becomes the set the customer can pick from. */
export function recordShown(s: Session, books: Book[]) {
  if (books.length) s.pendingBooks = books.slice(0, 6).map(candidate);
}

export function resolveOrder(s: Session, orderId: string) {
  add(s.resolvedOrders, orderId);
  s.pendingOrders = [];
}

/**
 * Orders we just listed become the set to pick from. The customer may already have said which
 * one before the list existed ("And God Bless You, Mr. Rosewater, from last month?"), so their
 * latest message is checked against it straight away.
 */
export function recordOrderChoices(s: Session, orderIds: string[]) {
  if (orderIds.length === 1) return resolveOrder(s, orderIds[0]);
  s.pendingOrders = orderIds;
  const latest = [...s.transcript].reverse().find((t) => t.role === "user")?.text;
  if (latest) pickPendingOrder(s, latest);
}

// ─── Detecting the customer's pick ───────────────────────────────────────────

const ORDINALS: Record<string, number> = { first: 0, "1st": 0, one: 0, second: 1, "2nd": 1, two: 1, third: 2, "3rd": 2, three: 2, fourth: 3, "4th": 3, four: 3, fifth: 4, "5th": 4, five: 4 };

/** "the second one", "2nd", "#2", "option 2", "the last one". Only clear, short ordinal phrases count. */
export function ordinalPick(message: string, count: number): number | null {
  const m = message.toLowerCase();
  const word = m.match(/\b(?:the\s+)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|last)\s+(?:one|book|order|option)\b/) ?? m.match(/^\W*(?:the\s+)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|last)(?:\s+one)?\W*$/);
  const num = m.match(/(?:#|\bnumber\s+|\boption\s+)(\d|one|two|three|four|five)\b/);
  const key = word?.[1] ?? num?.[1];
  if (!key) return null;
  const i = key === "last" ? count - 1 : /^\d$/.test(key) ? Number(key) - 1 : ORDINALS[key];
  return i >= 0 && i < count ? i : null;
}

/**
 * Settle references from the customer's own message, before the model runs. Returns what was
 * resolved, for the trace.
 */
export function resolveFromCustomer(s: Session, message: string): string[] {
  const picked: string[] = [];
  // Books: any catalog title they named.
  for (const b of titlesIn(message)) {
    add(s.resolvedBooks, b.id);
    picked.push(b.title);
  }
  // Books: a pick from the list we showed, by position or by author.
  if (s.pendingBooks.length && !picked.length) {
    const lower = ` ${normalize(message)} `;
    const i = ordinalPick(message, s.pendingBooks.length);
    const byAuthor = s.pendingBooks.filter((c) => lower.includes(` ${normalize(c.author).split(" ").pop()} `));
    const both = /\b(both|all of them|all three|all 3)\b/i.test(message) ? s.pendingBooks.slice(0, /\bboth\b/i.test(message) ? 2 : 5) : [];
    const chosen = i !== null ? [s.pendingBooks[i]] : byAuthor.length === 1 ? byAuthor : both;
    for (const c of chosen) {
      add(s.resolvedBooks, c.id);
      picked.push(c.title);
    }
  }
  // Orders: an order number they typed, or a pick among the orders we listed.
  for (const m of message.matchAll(/\bBK-?(\d{3,5})\b/gi)) {
    const id = normalizeOrderId(m[0]);
    if (allOrders().some((o) => o.orderId === id)) {
      resolveOrder(s, id);
      picked.push(id);
    }
  }
  const order = pickPendingOrder(s, message);
  if (order) picked.push(order);
  return picked;
}

/** Resolve one of the pending orders from a message: by an item title, a status, or a position. */
function pickPendingOrder(s: Session, message: string): string | null {
  if (!s.pendingOrders.length) return null;
  const orders = s.pendingOrders.map((id) => allOrders().find((o) => o.orderId === id)).filter((o): o is Order => !!o);
  const named = new Set(titlesIn(message).map((b) => b.id));
  const byItem = orders.filter((o) => o.items.some((it) => it.bookId && named.has(it.bookId)));
  const status = message.match(/\b(delivered|shipped|in transit|processing)\b/i)?.[1].toLowerCase().replace("in transit", "shipped");
  const byStatus = status ? orders.filter((o) => o.status === status) : [];
  const i = ordinalPick(message, orders.length);
  const chosen = byItem.length === 1 ? byItem[0] : byStatus.length === 1 ? byStatus[0] : i !== null ? orders[i] : null;
  if (!chosen) return null;
  resolveOrder(s, chosen.orderId);
  return chosen.orderId;
}

// ─── The gate ─────────────────────────────────────────────────────────────────

function orderChoice(o: Order) {
  return { order_id: o.orderId, status: o.status, items: o.items.map((i) => i.title) };
}

/** Returns a rejection if the tool would act on something the customer hasn't settled on; null to proceed. */
export function checkGate(tool: string, input: Record<string, unknown>, ctx: ToolContext): ToolOutcome | null {
  const rule = GATED[tool];
  if (!rule) return null;
  const s = ctx.session;
  const passed: string[] = [];

  for (const field of rule.books ?? []) {
    const raw = input[field];
    if (typeof raw !== "string") continue;
    const book = resolveBook(raw) ?? getBook(raw);
    if (!book) continue; // unknown ids are the tool's problem, not ambiguity
    if (!s.resolvedBooks.includes(book.id)) return block(ctx, tool, book.title, s.pendingBooks, "book");
    passed.push(book.title);
  }
  for (const field of rule.orders ?? []) {
    const raw = input[field];
    if (typeof raw !== "string") continue;
    const id = normalizeOrderId(raw);
    if (!s.verifiedOrderIds.includes(id)) continue; // unverified orders get the tool's verification error
    if (!s.resolvedOrders.includes(id)) {
      const choices = s.pendingOrders.map((p) => allOrders().find((o) => o.orderId === p)).filter((o): o is Order => !!o).map(orderChoice);
      return block(ctx, tool, id, choices, "order");
    }
    passed.push(id);
  }
  if (passed.length) ctx.emitTrace({ type: "guardrail", rule: "disambiguation_gate", detail: `passed: ${tool} → ${passed.join(", ")}` });
  return null;
}

function block(ctx: ToolContext, tool: string, target: string, candidates: Candidate[] | ReturnType<typeof orderChoice>[], kind: "book" | "order"): ToolOutcome {
  ctx.emitTrace({ type: "guardrail", rule: "disambiguation_gate", detail: `blocked: ${tool} → ${target} (the customer hasn't chosen this ${kind})` });
  return {
    ok: false,
    data: {
      error: "ambiguous",
      message: candidates.length
        ? `The customer hasn't chosen yet. Ask which ${kind} they mean, naming the options briefly.`
        : `The customer hasn't named this ${kind}. Confirm it with them, or search first, before acting on it.`,
      candidates,
    },
  };
}
