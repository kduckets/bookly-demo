import { addItem, removeItem } from "@/lib/cart";
import { cartView } from "@/lib/agent/session";
import type { Format } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const FORMATS: Format[] = ["hardcover", "paperback", "ebook"];

export async function GET(req: Request) {
  const shopperId = new URL(req.url).searchParams.get("shopperId") ?? "";
  if (!ID_RE.test(shopperId)) return Response.json({ error: "Invalid shopper" }, { status: 400 });
  return Response.json({ cart: cartView(shopperId) });
}

export async function POST(req: Request) {
  const { shopperId, bookId, format, quantity, action } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof shopperId !== "string" || !ID_RE.test(shopperId) || typeof bookId !== "string")
    return Response.json({ error: "Invalid request" }, { status: 400 });
  const fmt = FORMATS.includes(format as Format) ? (format as Format) : undefined;
  const r =
    action === "remove"
      ? removeItem(shopperId, bookId, fmt)
      : fmt
        ? addItem(shopperId, bookId, fmt, typeof quantity === "number" ? Math.max(1, Math.min(10, quantity)) : 1)
        : ({ ok: false, error: "Choose a format." } as const);
  if (!r.ok) return Response.json({ error: r.error, cart: cartView(shopperId) }, { status: 409 });
  return Response.json({ cart: r.cart });
}
