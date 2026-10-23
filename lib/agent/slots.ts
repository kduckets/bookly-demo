/**
 * Required information ("slots") per customer intent. The pre-check extracts slot values from
 * each message, tools fill them from verified results, and the session context tells the model
 * what is still missing so it can ask for one or two things at a time.
 */

export const INTENTS = [
  "find_book",
  "recommend",
  "discuss_book",
  "order_status",
  "return",
  "exchange",
  "gift_card",
  "checkout",
  "account",
  "policy",
  "human",
  "other",
] as const;
export type Intent = (typeof INTENTS)[number];

export const REQUIRED_SLOTS: Partial<Record<Intent, string[]>> = {
  find_book: ["book"],
  recommend: ["interest"],
  order_status: ["order_id", "email"],
  return: ["email", "order_id", "item", "reason", "refund_method"],
  exchange: ["email", "order_id", "item", "new_book", "new_format"],
  gift_card: ["amount", "recipient_name", "recipient_email"],
  checkout: ["cart_reviewed"],
  account: ["email"],
};

export const SLOT_NAMES = [
  "book",
  "interest",
  "order_id",
  "email",
  "item",
  "reason",
  "refund_method",
  "new_book",
  "new_format",
  "amount",
  "recipient_name",
  "recipient_email",
  "gift_message",
  "delivery_date",
] as const;

export function missingSlots(intent: Intent | null, collected: Record<string, string>): string[] {
  if (!intent) return [];
  return (REQUIRED_SLOTS[intent] ?? []).filter((s) => !collected[s]);
}
