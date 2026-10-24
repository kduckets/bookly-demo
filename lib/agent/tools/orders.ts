import { z } from "zod";
import { formatPrice } from "@/data/catalog";
import { allOrders } from "@/data/orders";
import { POLICY_NUMBERS } from "@/data/policies";
import type { Format, Order, OrderItem } from "@/lib/types";
import { canonicalKey, clearPreview, gateConfirmation } from "../guardrails";
import type { Session } from "../session";
import { defineTool, fail, ok, type ToolOutcome } from "./types";
import { recordOrderChoices, resolveOrder } from "../gate";
import { daysSince, money, normalize, normalizeOrderId, orderForModel, orderView, resolveBook, shortId } from "./util";

const NOT_FOUND = "We couldn't find an order matching that order number and email. Ask the customer to double-check both.";

function verifiedOrder(session: Session, rawId: string): Order | ToolOutcome {
  const id = normalizeOrderId(rawId);
  const order = allOrders().find((o) => o.orderId === id);
  if (!order || !session.verifiedOrderIds.includes(id)) {
    return fail("This order has not been verified in this conversation. Use lookup_order (order number + email) or list_orders_for_email first.");
  }
  return order;
}

function findItem(order: Order, ref: string): OrderItem | undefined {
  return (
    order.items.find((i) => i.itemId === ref) ??
    order.items.find((i) => i.bookId === ref) ??
    order.items.find((i) => normalize(i.title).includes(normalize(ref)))
  );
}

/** The return/exchange policy, applied in code. The model cannot override this. */
export function eligibility(order: Order, item: OrderItem) {
  const days = daysSince(order.deliveredAt);
  const base = { item_id: item.itemId, title: item.title, delivered_days_ago: days };
  if (item.returned) return { ...base, return_eligible: false, exchange_eligible: false, reason: "This item has already been returned." };
  if (item.kind === "gift_card") return { ...base, return_eligible: false, exchange_eligible: false, reason: "Gift cards are non-refundable and cannot be exchanged." };
  if (order.status !== "delivered" || days == null)
    return {
      ...base,
      return_eligible: false,
      exchange_eligible: false,
      reason: order.status === "lost_in_transit" ? "The package was lost in transit; this needs a human team member (escalate)." : "The order has not been delivered yet, so it can't be returned. It may be possible to cancel through a human team member.",
    };
  if (item.format === "ebook" && item.downloaded) return { ...base, return_eligible: false, exchange_eligible: false, reason: "Ebooks cannot be returned or exchanged once downloaded." };
  if (item.damaged) return { ...base, return_eligible: true, exchange_eligible: true, reason: "Arrived damaged: eligible for a return or replacement regardless of the 30-day window." };
  if (days <= POLICY_NUMBERS.returnWindowDays)
    return { ...base, return_eligible: true, exchange_eligible: true, reason: `Delivered ${days} days ago, within the ${POLICY_NUMBERS.returnWindowDays}-day return window.` };
  if (days <= POLICY_NUMBERS.exchangeWindowDays)
    return {
      ...base,
      return_eligible: false,
      exchange_eligible: true,
      reason: `Delivered ${days} days ago, outside the ${POLICY_NUMBERS.returnWindowDays}-day return window. It can still be exchanged (within ${POLICY_NUMBERS.exchangeWindowDays} days), but not refunded.`,
    };
  return { ...base, return_eligible: false, exchange_eligible: false, reason: `Delivered ${days} days ago, outside both the return and exchange windows.` };
}

export const lookupOrder = defineTool({
  name: "lookup_order",
  description:
    "Look up an order's status, items, dates, and tracking. Requires BOTH the order number and the email used on the order. If they don't match, you'll get a generic not-found message; never guess which part was wrong.",
  schema: z.object({ order_id: z.string(), email: z.string() }),
  run(input, ctx) {
    const id = normalizeOrderId(input.order_id);
    const order = allOrders().find((o) => o.orderId === id && o.email.toLowerCase() === input.email.trim().toLowerCase());
    if (!order) return fail(NOT_FOUND, "order_lookup");
    const s = ctx.session;
    if (!s.verifiedOrderIds.includes(order.orderId)) s.verifiedOrderIds.push(order.orderId);
    resolveOrder(s, order.orderId); // order number + email names the order exactly
    s.slots.order_id = order.orderId;
    s.slots.email = order.email;
    ctx.emitUI({ type: "order_card", order: orderView(order) });
    return ok(orderForModel(order));
  },
});

export const listOrdersForEmail = defineTool({
  name: "list_orders_for_email",
  description:
    "List a customer's orders by email, for when they don't know the order number. (Prototype: assumes the email has been verified.) If several orders come back and it's unclear which one they mean, ask.",
  schema: z.object({ email: z.string() }),
  run(input, ctx) {
    const email = input.email.trim().toLowerCase();
    const orders = allOrders().filter((o) => o.email.toLowerCase() === email);
    if (!orders.length) return fail("No orders found for that email. Ask the customer to check the address or provide an order number.", "order_lookup");
    const s = ctx.session;
    for (const o of orders) if (!s.verifiedOrderIds.includes(o.orderId)) s.verifiedOrderIds.push(o.orderId);
    s.slots.email = email;
    if (orders.length === 1) s.slots.order_id = orders[0].orderId;
    // Several orders: the customer must pick one, unless only one is eligible for what they asked.
    let whichOrder = orders.length === 1 ? `resolved: ${orders[0].orderId} (their only order)` : "ask the customer which order they mean";
    const want = s.activeIntent === "return" ? "return_eligible" : s.activeIntent === "exchange" ? "exchange_eligible" : null;
    const eligible = want ? orders.filter((o) => o.items.some((it) => eligibility(o, it)[want])) : [];
    if (orders.length > 1 && eligible.length === 1) {
      resolveOrder(s, eligible[0].orderId);
      whichOrder = `resolved: ${eligible[0].orderId} (the only order eligible for a ${s.activeIntent})`;
    } else recordOrderChoices(s, orders.map((o) => o.orderId));
    ctx.emitUI({ type: "order_list", orders: orders.map(orderView) });
    return ok({ count: orders.length, which_order: whichOrder, orders: orders.map(orderForModel) });
  },
});

export const checkReturnEligibility = defineTool({
  name: "check_return_eligibility",
  description: "Apply Bookly's return and exchange policy to one item in a verified order. Always call this before offering a return or exchange.",
  schema: z.object({ order_id: z.string(), item_id: z.string().describe("item_id from the order, or the item's title") }),
  run(input, ctx) {
    const order = verifiedOrder(ctx.session, input.order_id);
    if ("ok" in order) return order;
    const item = findItem(order, input.item_id);
    if (!item) return fail(`No item matching "${input.item_id}" in ${order.orderId}. Items: ${order.items.map((i) => `${i.itemId} ${i.title}`).join("; ")}`);
    ctx.session.slots.item = item.title;
    return ok(eligibility(order, item));
  },
});

export const initiateReturn = defineTool({
  name: "initiate_return",
  description:
    "Start a return for one or more eligible items. Collect reason and refund_method (original_payment: 5–7 business days after we receive it; store_credit: instant). Call with confirm=false to preview, then confirm=true with identical details only after the customer explicitly agrees.",
  schema: z.object({
    order_id: z.string(),
    item_ids: z.array(z.string()).min(1),
    reason: z.string().min(1),
    refund_method: z.enum(["original_payment", "store_credit"]),
    confirm: z.boolean(),
  }),
  run(input, ctx) {
    const s = ctx.session;
    const order = verifiedOrder(s, input.order_id);
    if ("ok" in order) return order;
    const items: OrderItem[] = [];
    for (const ref of input.item_ids) {
      const item = findItem(order, ref);
      if (!item) return fail(`No item matching "${ref}" in ${order.orderId}.`);
      const e = eligibility(order, item);
      if (!e.return_eligible) {
        ctx.emitTrace({ type: "guardrail", rule: "return_policy", detail: `${item.title}: ${e.reason}` });
        return fail(`Not eligible for return: ${e.reason}`, undefined, { exchange_eligible: e.exchange_eligible });
      }
      items.push(item);
    }
    const refund = Math.round(items.reduce((n, i) => n + i.price * i.quantity, 0) * 100) / 100;
    const timing = input.refund_method === "store_credit" ? "issued instantly as store credit" : "to the original payment method within 5–7 business days of receipt";
    const lines = [
      ...items.map((i) => `Return: ${i.title}${i.format ? ` (${i.format})` : ""} — ${money(i.price * i.quantity)}`),
      `Reason: ${input.reason}`,
      `Refund ${money(refund)}, ${timing}`,
      "Free prepaid return label sent by email",
    ];
    const key = canonicalKey({ o: order.orderId, i: items.map((i) => i.itemId).sort().join(","), r: input.refund_method });
    const gate = gateConfirmation(s, "return", key, input.confirm, lines.join("; "));
    if (gate.status === "rejected") {
      ctx.emitTrace({ type: "guardrail", rule: "confirmation_required", detail: `initiate_return: ${gate.reason}` });
      return fail(gate.reason);
    }
    s.slots.reason = input.reason;
    s.slots.refund_method = input.refund_method;
    if (gate.status === "preview") {
      ctx.emitUI({ type: "confirmation", kind: "return", stage: "preview", title: `Return from ${order.orderId}`, lines });
      return ok({ preview: lines, next_step: "Show this to the customer and ask them to confirm." });
    }
    for (const i of items) i.returned = true;
    const rma = shortId("RMA");
    clearPreview(s, "return");
    ctx.emitUI({ type: "confirmation", kind: "return", stage: "done", title: "Return started", lines, reference: rma });
    return ok({ return_id: rma, refund_amount: refund, refund_timing: timing, label: "emailed" });
  },
});

export const initiateExchange = defineTool({
  name: "initiate_exchange",
  description:
    "Exchange one item from a verified order for a different catalog book or format. Exchanges are free; price differences are charged to the card on file or returned as store credit. Call with confirm=false to preview, then confirm=true with identical details only after the customer explicitly agrees.",
  schema: z.object({
    order_id: z.string(),
    item_id: z.string(),
    new_book_id: z.string(),
    new_format: z.enum(["hardcover", "paperback", "ebook"]),
    confirm: z.boolean(),
  }),
  run(input, ctx) {
    const s = ctx.session;
    const order = verifiedOrder(s, input.order_id);
    if ("ok" in order) return order;
    const item = findItem(order, input.item_id);
    if (!item) return fail(`No item matching "${input.item_id}" in ${order.orderId}.`);
    const e = eligibility(order, item);
    if (!e.exchange_eligible) {
      ctx.emitTrace({ type: "guardrail", rule: "exchange_policy", detail: `${item.title}: ${e.reason}` });
      return fail(`Not eligible for exchange: ${e.reason}`);
    }
    const nb = resolveBook(input.new_book_id);
    if (!nb) return fail("Unknown new_book_id. Use search_catalog first.");
    if (!nb.formats.includes(input.new_format as Format)) return fail(`${nb.title} is not available as ${input.new_format}.`);
    if (input.new_format !== "ebook" && nb.stock < 1) return fail(`Print copies of ${nb.title} are sold out.`);
    const newPrice = formatPrice(nb, input.new_format);
    const diff = Math.round((newPrice - item.price) * 100) / 100;
    const lines = [
      `Send back: ${item.title} (${item.format}) — ${money(item.price)}`,
      `Receive: ${nb.title} (${input.new_format}) — ${money(newPrice)}`,
      diff > 0 ? `Difference ${money(diff)} charged to Visa ending 4242` : diff < 0 ? `Difference ${money(-diff)} issued as store credit` : "No price difference",
      "Free prepaid return label sent by email",
    ];
    const key = canonicalKey({ o: order.orderId, i: item.itemId, b: nb.id, f: input.new_format });
    const gate = gateConfirmation(s, "exchange", key, input.confirm, lines.join("; "));
    if (gate.status === "rejected") {
      ctx.emitTrace({ type: "guardrail", rule: "confirmation_required", detail: `initiate_exchange: ${gate.reason}` });
      return fail(gate.reason);
    }
    s.slots.new_book = nb.title;
    s.slots.new_format = input.new_format;
    if (gate.status === "preview") {
      ctx.emitUI({ type: "confirmation", kind: "exchange", stage: "preview", title: `Exchange from ${order.orderId}`, lines });
      return ok({ preview: lines, next_step: "Show this to the customer and ask them to confirm." });
    }
    item.returned = true;
    const ref = shortId("EXC");
    clearPreview(s, "exchange");
    ctx.emitUI({ type: "confirmation", kind: "exchange", stage: "done", title: "Exchange started", lines, reference: ref });
    return ok({ exchange_id: ref, price_difference: diff });
  },
});
