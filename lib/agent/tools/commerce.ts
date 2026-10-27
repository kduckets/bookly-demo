import { z } from "zod";
import { allOrders } from "@/data/orders";
import { POLICY_NUMBERS } from "@/data/policies";
import { addItem, removeItem } from "@/lib/cart";
import { canonicalKey, clearPreview, gateConfirmation, traceConfirm } from "../guardrails";
import { resolveOrder } from "../gate";
import { cartView, logAction, setCartItems } from "../session";
import { defineTool, fail, ok } from "./types";
import { maskEmail, money, resolveBook, shortId } from "./util";

const FormatEnum = z.enum(["hardcover", "paperback", "ebook"]);

export const addToCart = defineTool({
  name: "add_to_cart",
  description: "Add a catalog book to the customer's cart in a specific format. Updates the cart icon on screen.",
  schema: z.object({ book_id: z.string(), format: FormatEnum, quantity: z.number().int().min(1).max(10).default(1) }),
  run(input, ctx) {
    const r = addItem(ctx.session.shopperId, input.book_id, input.format, input.quantity);
    if (!r.ok) return fail(r.error);
    ctx.emitUI({ type: "cart_updated", cart: r.cart });
    return ok({ added: `${r.title} (${input.format})`, cart_count: r.cart.count, subtotal: money(r.cart.subtotal) });
  },
});

export const removeFromCart = defineTool({
  name: "remove_from_cart",
  description: "Remove a book (optionally a specific format) from the customer's cart.",
  schema: z.object({ book_id: z.string(), format: FormatEnum.optional() }),
  run(input, ctx) {
    const id = resolveBook(input.book_id)?.id ?? input.book_id;
    const r = removeItem(ctx.session.shopperId, id, input.format);
    if (!r.ok) return fail(r.error);
    ctx.emitUI({ type: "cart_updated", cart: r.cart });
    return ok({ removed: r.title, cart_count: r.cart.count });
  },
});

function shippingFor(subtotal: number, method: "standard" | "expedited", allDigital: boolean) {
  if (allDigital) return 0;
  if (method === "expedited") return POLICY_NUMBERS.expeditedShippingFee;
  return subtotal > POLICY_NUMBERS.freeShippingThreshold ? 0 : POLICY_NUMBERS.standardShippingFee;
}

export const viewCart = defineTool({
  name: "view_cart",
  description: "Show what is in the customer's cart, with subtotal and the standard shipping estimate.",
  schema: z.object({}),
  run(_input, ctx) {
    const cart = cartView(ctx.session.shopperId);
    const allDigital = cart.items.every((i) => i.format === "ebook");
    return ok({
      items: cart.items.map((i) => ({ book_id: i.bookId, title: i.title, format: i.format, quantity: i.quantity, unit_price: i.unitPrice })),
      count: cart.count,
      subtotal: cart.subtotal,
      standard_shipping: cart.count ? shippingFor(cart.subtotal, "standard", allDigital) : 0,
    });
  },
});

export const checkout = defineTool({
  name: "checkout",
  description:
    "Place an order for everything in the cart using the card and address on file (Visa ending 4242). Two steps: call with confirm=false to produce a preview and show it; only after the customer explicitly agrees on their next message, call again with confirm=true and the same shipping_method. Never ask for card numbers.",
  schema: z.object({ confirm: z.boolean(), shipping_method: z.enum(["standard", "expedited"]).default("standard") }),
  run(input, ctx) {
    const s = ctx.session;
    const cart = cartView(s.shopperId);
    if (!cart.count) return fail("The cart is empty.");
    const allDigital = cart.items.every((i) => i.format === "ebook");
    const shipping = shippingFor(cart.subtotal, input.shipping_method, allDigital);
    const total = Math.round((cart.subtotal + shipping) * 100) / 100;
    const lines = [
      ...cart.items.map((i) => `${i.quantity} × ${i.title} (${i.format}) — ${money(i.unitPrice * i.quantity)}`),
      `Subtotal ${money(cart.subtotal)} · Shipping ${shipping ? money(shipping) : "free"} (${allDigital ? "digital" : input.shipping_method})`,
      `Total ${money(total)} · Visa ending 4242 · Ship to address on file`,
    ];
    const key = canonicalKey({ items: cart.items.map((i) => `${i.bookId}:${i.format}:${i.quantity}`).join("|"), m: input.shipping_method });
    const gate = gateConfirmation(s, "checkout", key, input.confirm, lines.join("; "));
    traceConfirm(ctx.emitTrace, "checkout", gate);
    if (gate.status === "rejected") {
      return fail(gate.reason);
    }
    if (gate.status === "preview") {
      ctx.emitUI({ type: "confirmation", kind: "checkout", stage: "preview", title: "Ready to place this order?", lines });
      return ok({ preview: lines, next_step: "Show this to the customer and ask them to confirm. Do not confirm on their behalf." });
    }
    const orderId = `BK-${2000 + allOrders().length}`;
    const order = {
      orderId,
      email: "demo.shopper@example.com",
      status: "processing" as const,
      placedAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + (input.shipping_method === "expedited" ? 2 : 5) * 86_400_000).toISOString(),
      shippingMethod: allDigital ? ("digital" as const) : input.shipping_method,
      purchasedAt: "Ice-Nine Books" as const,
      items: cart.items.map((i, n) => ({ itemId: `${orderId.slice(3)}-${n + 1}`, bookId: i.bookId, title: i.title, kind: "book" as const, format: i.format, quantity: i.quantity, price: i.unitPrice })),
      total,
    };
    allOrders().push(order);
    logAction(s, `Order placed: ${orderId}, ${money(total)}`);
    s.verifiedOrderIds.push(orderId);
    resolveOrder(s, orderId);
    setCartItems(s.shopperId, []);
    clearPreview(s, "checkout");
    ctx.emitUI({ type: "cart_updated", cart: cartView(s.shopperId) });
    ctx.emitUI({ type: "confirmation", kind: "checkout", stage: "done", title: "Order placed", lines, reference: orderId });
    return ok({ order_id: orderId, total, status: "processing", confirmation_email: maskEmail(order.email) });
  },
});

export const purchaseGiftCard = defineTool({
  name: "purchase_gift_card",
  description: `Buy a Bookly e-gift card ($${POLICY_NUMBERS.giftCardMin}–$${POLICY_NUMBERS.giftCardMax}) charged to the card on file. Collect amount, recipient_name, and recipient_email first (ask one or two at a time; message and delivery_date are optional). Call with confirm=false to preview; call with confirm=true and identical details only after the customer explicitly agrees.`,
  schema: z.object({
    amount: z.number(),
    recipient_name: z.string().min(1),
    recipient_email: z.string().email(),
    message: z.string().max(300).optional(),
    delivery_date: z.string().optional().describe("YYYY-MM-DD; omit to send immediately"),
    confirm: z.boolean(),
  }),
  run(input, ctx) {
    const { giftCardMin: min, giftCardMax: max } = POLICY_NUMBERS;
    if (input.amount < min || input.amount > max) return fail(`Gift cards must be between $${min} and $${max}.`);
    const lines = [
      `${money(input.amount)} Bookly e-gift card`,
      `To ${input.recipient_name} <${maskEmail(input.recipient_email)}>`,
      input.message ? `Message: “${input.message}”` : "No message",
      `Delivery: ${input.delivery_date || "immediately"}`,
      "Charged to Visa ending 4242 · Never expires · Non-refundable",
    ];
    const key = canonicalKey({
      a: input.amount,
      n: input.recipient_name,
      e: input.recipient_email,
      m: input.message ?? "",
      d: input.delivery_date ?? "",
    });
    const gate = gateConfirmation(ctx.session, "gift_card", key, input.confirm, lines.join("; "));
    traceConfirm(ctx.emitTrace, "purchase_gift_card", gate);
    if (gate.status === "rejected") {
      return fail(gate.reason);
    }
    if (gate.status === "preview") {
      ctx.emitUI({ type: "confirmation", kind: "gift_card", stage: "preview", title: "Gift card preview", lines });
      return ok({ preview: lines, next_step: "Show this to the customer and ask them to confirm." });
    }
    const ref = shortId("GC");
    logAction(ctx.session, `Gift card sent: ${money(input.amount)} to ${input.recipient_name} (${ref})`);
    clearPreview(ctx.session, "gift_card");
    ctx.emitUI({ type: "confirmation", kind: "gift_card", stage: "done", title: "Gift card sent", lines, reference: ref });
    return ok({ gift_card_reference: ref, status: input.delivery_date ? `scheduled for ${input.delivery_date}` : "sent" });
  },
});
