import { CATALOG, formatPrice, getBook, locationLabel } from "@/data/catalog";
import type { Book, BookSummary, Order, OrderView } from "@/lib/types";

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve a book by ID, or leniently by exact/near title when the model passes a title. */
export function resolveBook(idOrTitle: string): Book | undefined {
  const direct = getBook(idOrTitle);
  if (direct) return direct;
  const n = normalize(idOrTitle);
  return (
    CATALOG.find((b) => normalize(b.title) === n) ??
    CATALOG.find((b) => normalize(b.title).replace(/^(the|a|an) /, "") === n.replace(/^(the|a|an) /, ""))
  );
}

export function summarize(b: Book): BookSummary {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    year: b.year,
    price: formatPrice(b, "paperback"),
    formats: b.formats,
    inStock: b.stock > 0,
    location: locationLabel(b),
  };
}

/** What the model sees for a book: enough to discuss and disambiguate, nothing invented. */
export function bookForModel(b: Book) {
  return {
    book_id: b.id,
    title: b.title,
    author: b.author,
    year: b.year,
    section: b.genre,
    themes: b.themes,
    description: b.description,
    prices: Object.fromEntries(b.formats.map((f) => [f, formatPrice(b, f)])),
    print_stock: b.stock,
    in_stock: b.stock > 0 ? "yes" : b.formats.includes("ebook") ? "print sold out; ebook available" : "sold out",
    location: locationLabel(b),
  };
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

export function normalizeOrderId(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  const digits = t.replace(/^BK-?/, "").replace(/^#/, "");
  return /^\d{3,5}$/.test(digits) ? `BK-${digits.padStart(4, "0")}` : t;
}

export function daysSince(iso?: string): number | undefined {
  if (!iso) return undefined;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function orderView(o: Order): OrderView {
  return {
    orderId: o.orderId,
    purchasedAt: o.purchasedAt,
    emailMasked: maskEmail(o.email),
    status: o.status,
    placedAt: o.placedAt,
    deliveredAt: o.deliveredAt,
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    estimatedDelivery: o.estimatedDelivery,
    items: o.items.map((i) => ({
      itemId: i.itemId,
      title: i.title,
      kind: i.kind,
      format: i.format,
      quantity: i.quantity,
      price: i.price,
      damaged: i.damaged,
    })),
    total: o.total,
    note: o.note,
  };
}

/** Order data for the model. Email is masked; dates are given as day counts to avoid date math errors. */
export function orderForModel(o: Order) {
  return {
    order_id: o.orderId,
    email: maskEmail(o.email),
    status: o.status,
    placed_days_ago: daysSince(o.placedAt),
    delivered_days_ago: daysSince(o.deliveredAt),
    estimated_delivery: o.estimatedDelivery?.slice(0, 10),
    carrier: o.carrier,
    tracking_number: o.trackingNumber,
    shipping_method: o.shippingMethod,
    purchased_at: o.purchasedAt,
    items: o.items.map((i) => ({
      item_id: i.itemId,
      title: i.title,
      kind: i.kind,
      format: i.format,
      quantity: i.quantity,
      price: i.price,
      ...(i.damaged ? { damaged_on_arrival: true } : {}),
      ...(i.downloaded ? { downloaded: true } : {}),
      ...(i.returned ? { already_returned: true } : {}),
    })),
    total: o.total,
    note: o.note,
  };
}

export const money = (n: number) => `$${n.toFixed(2)}`;

export function shortId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
