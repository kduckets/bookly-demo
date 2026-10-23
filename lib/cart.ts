import { formatPrice } from "@/data/catalog";
import { resolveBook } from "@/lib/agent/tools/util";
import { cartView, getCartItems, setCartItems } from "@/lib/agent/session";
import type { Cart, Format } from "@/lib/types";

/** Cart operations shared by the store UI (/api/cart) and the agent's tools. */

export type CartResult = { ok: true; cart: Cart; title: string } | { ok: false; error: string };

export function addItem(shopperId: string, bookId: string, format: Format, quantity = 1): CartResult {
  const b = resolveBook(bookId);
  if (!b) return { ok: false, error: "Unknown book_id. Use search_catalog first." };
  if (!b.formats.includes(format)) return { ok: false, error: `${b.title} is not available as ${format}. Available: ${b.formats.join(", ")}.` };
  const items = getCartItems(shopperId).map((i) => ({ ...i }));
  const existing = items.find((i) => i.bookId === b.id && i.format === format);
  const qty = format === "ebook" ? 1 : (existing?.quantity ?? 0) + quantity;
  if (format !== "ebook" && qty > b.stock) {
    return {
      ok: false,
      error:
        b.stock === 0
          ? `Print copies of ${b.title} are sold out.${b.formats.includes("ebook") ? " The ebook is available." : ""}`
          : `Only ${b.stock} print copies of ${b.title} are in stock.`,
    };
  }
  if (existing) existing.quantity = qty;
  else items.push({ bookId: b.id, title: b.title, author: b.author, format, quantity: qty, unitPrice: formatPrice(b, format) });
  setCartItems(shopperId, items);
  return { ok: true, cart: cartView(shopperId), title: b.title };
}

export function removeItem(shopperId: string, bookId: string, format?: Format): CartResult {
  const before = getCartItems(shopperId);
  const after = before.filter((i) => !(i.bookId === bookId && (!format || i.format === format)));
  if (after.length === before.length) return { ok: false, error: "That book is not in the cart." };
  setCartItems(shopperId, after);
  return { ok: true, cart: cartView(shopperId), title: before.find((i) => i.bookId === bookId)?.title ?? bookId };
}
