/**
 * Store policies. This file is the ONLY source the agent may use for policy answers
 * (via the get_policy tool), and the tool implementations enforce the same numbers.
 */

export const POLICY_NUMBERS = {
  returnWindowDays: 30,
  exchangeWindowDays: 60,
  freeShippingThreshold: 35,
  standardShippingFee: 4.99,
  expeditedShippingFee: 9.99,
  giftCardMin: 10,
  giftCardMax: 500,
} as const;

export type PolicyTopic =
  | "shipping"
  | "returns"
  | "refunds"
  | "exchanges"
  | "gift_cards"
  | "privacy"
  | "store_hours";

export const POLICY_TOPICS: PolicyTopic[] = [
  "shipping",
  "returns",
  "refunds",
  "exchanges",
  "gift_cards",
  "privacy",
  "store_hours",
];

export const POLICIES: Record<PolicyTopic, { title: string; text: string }> = {
  shipping: {
    title: "Shipping",
    text: [
      "Standard shipping takes 3–5 business days and costs $4.99.",
      "Expedited shipping takes 1–2 business days and costs $9.99.",
      "Standard shipping is free on orders over $35.",
      "Orders usually leave our warehouse within 1 business day. Ebooks are delivered instantly to your Bookly library.",
      "If a package is marked lost by the carrier, a Bookly team member will open a trace and arrange a replacement or refund.",
    ].join(" "),
  },
  returns: {
    title: "Returns",
    text: [
      "Books may be returned within 30 days of delivery in their original condition.",
      "Items that arrive damaged or defective are always eligible for return, regardless of the 30-day window.",
      "Ebooks cannot be returned once downloaded.",
      "Gift cards cannot be returned.",
      "Return shipping is free; we email a prepaid label when the return is opened.",
      "Orders from bookly.com or any Bookly shop, including Ice-Nine Books, can be returned through any of them, under this same policy.",
    ].join(" "),
  },
  refunds: {
    title: "Refunds",
    text: [
      "Refunds go to the original payment method within 5–7 business days after we receive the return,",
      "or can be issued instantly as Bookly store credit.",
      "Original shipping charges are refunded only when the item arrived damaged or we made an error.",
      "Bookly staff, including the store's AI clerk, cannot approve refunds outside this policy; exceptions require a human team member.",
    ].join(" "),
  },
  exchanges: {
    title: "Exchanges",
    text: [
      "Exchanges are free. Within 60 days of delivery, a book in original condition may be exchanged for a different title or format.",
      "If the new item costs more, the difference is charged to the card on file; if it costs less, the difference is issued as store credit.",
      "Between 31 and 60 days after delivery, an exchange is the only option (no refund).",
      "Ebooks and gift cards cannot be exchanged.",
      "Orders from bookly.com or any Bookly shop, including Ice-Nine Books, can be exchanged through any of them.",
    ].join(" "),
  },
  gift_cards: {
    title: "Gift cards",
    text: [
      "Bookly gift cards are available from $10 to $500.",
      "They are delivered by email on the date you choose, never expire, and have no fees.",
      "A Bookly gift card can be used on bookly.com and at every Bookly shop, including Ice-Nine Books, and any remaining balance carries over between them.",
      "Gift cards are non-refundable and cannot be exchanged for cash.",
    ].join(" "),
  },
  privacy: {
    title: "Privacy",
    text: [
      "Bookly uses your email and order history only to fulfill orders and provide support.",
      "We never sell personal data. Payment details are stored by our payment processor, not by Bookly,",
      "and no Bookly staff member or assistant will ever ask you for a full card number.",
      "You can request deletion of your account data by contacting support.",
    ].join(" "),
  },
  store_hours: {
    title: "Store hours",
    text: [
      "The Bookly shop on Monkey House Lane is open Monday to Saturday, 9am to 9pm, and Sunday, 11am to 6pm.",
      "Online support with a human team member is available Monday to Saturday, 8am to 8pm Eastern.",
      "The AI clerk is available any time.",
    ].join(" "),
  },
};
