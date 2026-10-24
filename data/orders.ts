import type { Order } from "@/lib/types";

/**
 * Seeded orders. Dates are relative to server start so "delivered 5 days ago" stays true.
 * Each order exists to exercise one edge case; see the comment above it.
 */

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * DAY).toISOString();

export const ORDERS: Order[] = [
  // Multiple orders on one email (triggers "which order?"). This one: delivered 5 days ago, return-eligible.
  {
    orderId: "BK-1042",
    purchasedAt: "bookly.com",
    email: "billy.pilgrim@example.com",
    status: "delivered",
    placedAt: ago(10),
    shippedAt: ago(8),
    deliveredAt: ago(5),
    carrier: "USPS",
    trackingNumber: "9400 1000 0000 0000 1042",
    shippingMethod: "standard",
    items: [
      { itemId: "1042-1", bookId: "kv-cats-cradle", title: "Cat's Cradle", kind: "book", format: "paperback", quantity: 1, price: 16.99 },
      { itemId: "1042-2", bookId: "sf-dune", title: "Dune", kind: "book", format: "hardcover", quantity: 1, price: 28.0 },
    ],
    total: 44.99,
  },
  // Same email: a second delivered, return-eligible order, so "I want to return a book" must ask which.
  {
    orderId: "BK-1071",
    purchasedAt: "Ice-Nine Bookshop",
    email: "billy.pilgrim@example.com",
    status: "delivered",
    placedAt: ago(16),
    shippedAt: ago(15),
    deliveredAt: ago(12),
    carrier: "USPS",
    trackingNumber: "9400 1000 0000 0000 1071",
    shippingMethod: "standard",
    items: [
      { itemId: "1071-1", bookId: "kv-breakfast-of-champions", title: "Breakfast of Champions", kind: "book", format: "paperback", quantity: 1, price: 16.99 },
    ],
    total: 16.99 + 4.99,
  },
  // Same email: shipped and in transit with tracking.
  {
    orderId: "BK-1057",
    purchasedAt: "Ice-Nine Bookshop",
    email: "billy.pilgrim@example.com",
    status: "shipped",
    placedAt: ago(3),
    shippedAt: ago(2),
    carrier: "UPS",
    trackingNumber: "1Z 999 AA1 01 2345 6784",
    estimatedDelivery: ahead(2),
    shippingMethod: "standard",
    items: [
      { itemId: "1057-1", bookId: "st-cosmos", title: "Cosmos", kind: "book", format: "paperback", quantity: 1, price: 19.99 },
      { itemId: "1057-2", bookId: "sf-ubik", title: "Ubik", kind: "book", format: "paperback", quantity: 1, price: 15.99 },
    ],
    total: 35.98,
  },
  // Same email: still processing, not yet shipped.
  {
    orderId: "BK-1063",
    purchasedAt: "bookly.com",
    email: "billy.pilgrim@example.com",
    status: "processing",
    placedAt: ago(0.5),
    estimatedDelivery: ahead(5),
    shippingMethod: "expedited",
    items: [
      { itemId: "1063-1", bookId: "kv-galapagos", title: "Galápagos", kind: "book", format: "hardcover", quantity: 1, price: 26.0 },
    ],
    total: 26.0 + 9.99,
    note: "Expedited shipping selected.",
  },
  // Delivered 45 days ago: outside the 30-day return window, inside the 60-day exchange window.
  {
    orderId: "BK-0977",
    purchasedAt: "Ice-Nine Bookshop",
    email: "eliot.rosewater@example.com",
    status: "delivered",
    placedAt: ago(50),
    shippedAt: ago(48),
    deliveredAt: ago(45),
    carrier: "USPS",
    trackingNumber: "9400 1000 0000 0000 0977",
    shippingMethod: "standard",
    items: [
      { itemId: "0977-1", bookId: "kv-god-bless-you-mr-rosewater", title: "God Bless You, Mr. Rosewater", kind: "book", format: "hardcover", quantity: 1, price: 25.0 },
      { itemId: "0977-2", bookId: "cl-great-gatsby", title: "The Great Gatsby", kind: "book", format: "paperback", quantity: 1, price: 12.99 },
    ],
    total: 37.99,
  },
  // Delivered 40 days ago with one damaged item: the damaged item is eligible regardless of the window.
  {
    orderId: "BK-1019",
    purchasedAt: "bookly.com",
    email: "kilgore.trout@example.com",
    status: "delivered",
    placedAt: ago(44),
    shippedAt: ago(42),
    deliveredAt: ago(40),
    carrier: "FedEx",
    trackingNumber: "7712 3456 1019",
    shippingMethod: "standard",
    items: [
      { itemId: "1019-1", bookId: "sf-foundation", title: "Foundation", kind: "book", format: "hardcover", quantity: 1, price: 26.0, damaged: true },
      { itemId: "1019-2", bookId: "sf-childhoods-end", title: "Childhood's End", kind: "book", format: "paperback", quantity: 1, price: 15.99 },
    ],
    total: 41.99,
    note: "Customer reported water damage to Foundation on arrival.",
  },
  // Lost in transit: the agent should escalate rather than speculate.
  {
    orderId: "BK-0990",
    purchasedAt: "Ice-Nine Bookshop",
    email: "dwayne.hoover@example.com",
    status: "lost_in_transit",
    placedAt: ago(21),
    shippedAt: ago(19),
    carrier: "UPS",
    trackingNumber: "1Z 999 AA1 01 0990 0990",
    estimatedDelivery: ago(14),
    shippingMethod: "standard",
    items: [
      { itemId: "0990-1", bookId: "kv-breakfast-of-champions", title: "Breakfast of Champions", kind: "book", format: "hardcover", quantity: 1, price: 26.0 },
    ],
    total: 26.0 + 4.99,
    note: "Carrier marked the package lost after 10 days without a scan.",
  },
  // Contains a gift card (non-returnable) alongside a returnable book.
  {
    orderId: "BK-1033",
    purchasedAt: "bookly.com",
    email: "rabo.karabekian@example.com",
    status: "delivered",
    placedAt: ago(13),
    shippedAt: ago(12),
    deliveredAt: ago(10),
    carrier: "USPS",
    trackingNumber: "9400 1000 0000 0000 1033",
    shippingMethod: "standard",
    items: [
      { itemId: "1033-1", bookId: "kv-bluebeard", title: "Bluebeard", kind: "book", format: "hardcover", quantity: 1, price: 26.0 },
      { itemId: "1033-2", title: "Bookly Gift Card ($50)", kind: "gift_card", quantity: 1, price: 50.0 },
    ],
    total: 76.0,
  },
  // An ebook that has been downloaded: non-returnable.
  {
    orderId: "BK-1050",
    purchasedAt: "bookly.com",
    email: "mary.oloney@example.com",
    status: "delivered",
    placedAt: ago(4),
    deliveredAt: ago(4),
    shippingMethod: "digital",
    items: [
      { itemId: "1050-1", bookId: "st-godel-escher-bach", title: "Gödel, Escher, Bach", kind: "book", format: "ebook", quantity: 1, price: 20.99, downloaded: true },
    ],
    total: 20.99,
  },
];

/** Orders created during the demo (checkout, returns) live here, in memory. */
const g = globalThis as unknown as { __booklyOrders?: Order[] };
export function allOrders(): Order[] {
  if (!g.__booklyOrders) g.__booklyOrders = structuredClone(ORDERS);
  return g.__booklyOrders;
}
