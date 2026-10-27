import type Anthropic from "@anthropic-ai/sdk";
import type { CartItem, ConfirmKind, Cart } from "@/lib/types";
import type { Intent } from "./slots";
import type { Candidate } from "./match";

/**
 * In-memory session state, keyed by session ID. Fine for a prototype; production would use
 * Redis or a database (see README "Known gaps"). Stored on globalThis so dev hot-reloads keep it.
 */

export interface PendingPreview {
  /** Canonical key of the previewed arguments. confirm:true must match it exactly. */
  key: string;
  /** User turn on which the preview was shown. Confirmation must come on a later turn. */
  turn: number;
  summary: string;
}

/** A policy "no": what it was about, and the plain-language decision. */
export interface PolicyNo {
  /** e.g. "God Bless You, Mr. Rosewater (BK-0977)" */
  subject: string;
  /** One clear sentence: what can't happen, and why. */
  decision: string;
}

export interface Session {
  id: string;
  shopperId: string;
  createdAt: number;
  /** Top-level system prompt, frozen at session start (keeps the prompt cache and thinking valid). */
  systemPrompt: string;
  personaHash: string;
  /** Procedure versions the model has seen, to detect edits made mid-conversation. */
  procedureVersions: Record<string, number>;
  /** Append-only Messages API history, including thinking and tool blocks. */
  history: Anthropic.Beta.BetaMessageParam[];
  /** Plain-text transcript for handoff summaries. */
  transcript: { role: "user" | "assistant"; text: string }[];
  turn: number;
  turnLimit: number;
  locked: boolean;
  lockReason?: string;
  frustrationCount: number;
  failures: Record<string, number>;
  activeIntent: Intent | null;
  slots: Record<string, string>;
  verifiedOrderIds: string[];
  /** Disambiguation: books and orders the customer has settled on, and the open choices. */
  resolvedBooks: string[];
  pendingBooks: Candidate[];
  resolvedOrders: string[];
  pendingOrders: string[];
  previews: Partial<Record<ConfirmKind, PendingPreview>>;
  ticketId?: string;
  /** What happened this session, in plain words, for the handoff summary. */
  actions: string[];
  /** A policy "no" happened this turn: the reply must state it plainly and offer a human review. Set by tools, consumed by the loop. */
  handoffOfferDue?: PolicyNo;
  /** The review offer made on the last reply; a plain "yes" to it starts the callback flow. */
  pendingHandoffOffer?: PolicyNo & { turn: number };
  /** The customer accepted a review; we're waiting for a phone number. */
  awaitingCallback?: PolicyNo & { tries: number };
  /** The callback number the customer gave (kept server-side; shown only as its last four digits). */
  callbackPhone?: string;
  /** Reader requests added in this conversation (capped to prevent spam). */
  requestsAdded: number;
  messageTimes: number[];
}

const g = globalThis as unknown as {
  __booklySessions?: Map<string, Session>;
  __booklyCarts?: Map<string, CartItem[]>;
};
const sessions = (g.__booklySessions ??= new Map());
const carts = (g.__booklyCarts ??= new Map());

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function createSession(init: {
  id: string;
  shopperId: string;
  systemPrompt: string;
  personaHash: string;
  procedureVersions: Record<string, number>;
  turnLimit: number;
}): Session {
  // Prototype housekeeping: drop sessions idle for more than three hours.
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  for (const [id, old] of sessions) if ((old.messageTimes.at(-1) ?? old.createdAt) < cutoff) sessions.delete(id);
  const s: Session = {
    ...init,
    createdAt: Date.now(),
    history: [],
    transcript: [],
    turn: 0,
    locked: false,
    frustrationCount: 0,
    failures: {},
    activeIntent: null,
    slots: {},
    verifiedOrderIds: [],
    resolvedBooks: [],
    pendingBooks: [],
    resolvedOrders: [],
    pendingOrders: [],
    previews: {},
    requestsAdded: 0,
    actions: [],
    messageTimes: [],
  };
  sessions.set(init.id, s);
  return s;
}

export function deleteSession(id: string) {
  sessions.delete(id);
}

/** Drop every conversation for one shopper (used by "Reset demo"). Returns how many were cleared. */
export function deleteSessionsForShopper(shopperId: string): number {
  let n = 0;
  for (const [id, s] of sessions) {
    if (s.shopperId !== shopperId) continue;
    sessions.delete(id);
    n++;
  }
  return n;
}

/** Record something that happened (a return, a request, a declined check) for the handoff summary. */
export function logAction(s: Session, text: string) {
  if (!s.actions.includes(text)) s.actions.push(text);
}

// ─── Cart (keyed by shopper, so it survives "New conversation") ──────────────

export function getCartItems(shopperId: string): CartItem[] {
  if (!carts.has(shopperId)) carts.set(shopperId, []);
  return carts.get(shopperId)!;
}

export function setCartItems(shopperId: string, items: CartItem[]) {
  carts.set(shopperId, items);
}

export function cartView(shopperId: string): Cart {
  const items = getCartItems(shopperId);
  const subtotal = Math.round(items.reduce((n, i) => n + i.unitPrice * i.quantity, 0) * 100) / 100;
  return { items, subtotal, count: items.reduce((n, i) => n + i.quantity, 0) };
}
