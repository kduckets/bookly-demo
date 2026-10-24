// Shared types used by the store UI, the agent loop, and the API routes.

export type Format = "hardcover" | "paperback" | "ebook";
export type SectionId = "vonnegut" | "scifi" | "classics" | "scitech" | "music";

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  genre: string;
  section: SectionId;
  subgenres: string[];
  themes: string[];
  description: string;
  /** Paperback list price. Hardcover and ebook prices derive from it (see formatPrice). */
  price: number;
  formats: Format[];
  /** Print copies on hand. Ebooks are always available when listed. */
  stock: number;
  location: { aisle: number };
  relatedIds: string[];
}

export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  format: Format;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  count: number;
}

export type OrderStatus = "processing" | "shipped" | "delivered" | "lost_in_transit";

export interface OrderItem {
  itemId: string;
  bookId?: string;
  title: string;
  kind: "book" | "gift_card";
  format?: Format;
  quantity: number;
  price: number;
  damaged?: boolean;
  downloaded?: boolean;
  returned?: boolean;
}

export interface Order {
  orderId: string;
  email: string;
  status: OrderStatus;
  placedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippingMethod: "standard" | "expedited" | "digital";
  /** Where the order was placed. Every Bookly shop can support every Bookly order. */
  purchasedAt: Storefront;
  items: OrderItem[];
  total: number;
  note?: string;
}

/** A compact, safe-to-show view of a book used in chat cards. */
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  year: number;
  price: number;
  formats: Format[];
  inStock: boolean;
  location: string;
}

export type Storefront = "bookly.com" | "Ice-Nine Bookshop";

export interface OrderView {
  orderId: string;
  purchasedAt: Storefront;
  emailMasked: string;
  status: OrderStatus;
  placedAt: string;
  deliveredAt?: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  items: { itemId: string; title: string; kind: string; format?: string; quantity: number; price: number; damaged?: boolean }[];
  total: number;
  note?: string;
}

/** A book from Open Library. Reference information only: never purchasable unless booklyBookId is set. */
export interface ExternalBook {
  key: string;
  title: string;
  authors: string[];
  year?: number;
  subjects: string[];
  url: string;
  /** Set when Bookly already stocks this title. */
  booklyBookId: string | null;
}

/** A book customers have asked Bookly to stock. */
export interface WantedItem {
  id: string;
  title: string;
  author: string;
  year?: number;
  openLibraryKey?: string;
  requests: number;
  reasons: string[];
  lastRequestedAt: string;
}

export type ConfirmKind = "checkout" | "gift_card" | "return" | "exchange";

/** Events that change or decorate the store UI. Emitted by tools, rendered by the client. */
export type UIEvent =
  | { type: "highlight_book"; bookId: string; location: string }
  | { type: "cart_updated"; cart: Cart }
  | { type: "book_cards"; books: BookSummary[] }
  | { type: "order_card"; order: OrderView }
  | { type: "order_list"; orders: OrderView[] }
  | {
      type: "confirmation";
      kind: ConfirmKind;
      stage: "preview" | "done";
      title: string;
      lines: string[];
      reference?: string;
    }
  | { type: "handoff"; ticketId: string; summary: string; eta: string; reason: string }
  | { type: "session_locked"; reason: string }
  | { type: "external_books"; source: "open_library"; books: ExternalBook[] }
  | { type: "wanted_list_updated"; item: WantedItem; added: boolean };

export type ScopeLabel = "in_scope" | "off_topic" | "abusive" | "prompt_injection";

/** Observability events. Shown under each agent message when "Show agent trace" is on. */
export type TraceEvent =
  | {
      type: "precheck";
      label: ScopeLabel;
      intent: string;
      frustrated: boolean;
      wantsHuman: boolean;
      source: "model" | "heuristic";
      ms: number;
    }
  | { type: "tool_call"; name: string; input: unknown; output: string; ok: boolean; ms: number }
  | { type: "guardrail"; rule: string; detail: string }
  | { type: "slots"; intent: string; collected: Record<string, string>; missing: string[] }
  | { type: "match"; verdict: string; resolved?: string; candidates: string[]; reason: string }
  | { type: "procedure"; id: string; title: string; version: number; edited: boolean }
  | {
      type: "output_check";
      passed: boolean;
      regenerated: boolean;
      sanitized: boolean;
      claims: { kind: string; text: string; ok: boolean; reason?: string }[];
    }
  | {
      type: "turn";
      turn: number;
      limit: number;
      iterations: number;
      model: string;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      ms: number;
    };

/** Wire format for the /api/chat NDJSON stream. One JSON object per line. */
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "ui"; event: UIEvent }
  | { type: "trace"; event: TraceEvent }
  | { type: "status"; phase: "checking" }
  | { type: "done"; turn: number; limit: number; locked: boolean }
  | { type: "error"; message: string };
