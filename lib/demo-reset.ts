import { resetOrders } from "@/data/orders";
import { resetAllProcedures } from "@/lib/agent/procedures";
import { deleteSessionsForShopper, setCartItems } from "@/lib/agent/session";
import { resetWanted } from "@/lib/wanted";

/**
 * "Reset demo": put everything back to its starting state between recorded takes.
 * Sessions (and turn counts), this shopper's cart and procedure edits, the shared reader-requests
 * list, and the seeded orders (so BK-1042 is returnable again). The persona lives in the browser
 * and is reset there.
 */
export function resetDemo(shopperId: string) {
  const sessions = deleteSessionsForShopper(shopperId);
  setCartItems(shopperId, []);
  resetAllProcedures(shopperId);
  resetWanted();
  resetOrders();
  return { sessionsCleared: sessions };
}
