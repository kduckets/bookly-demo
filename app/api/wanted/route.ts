import { sortedWanted } from "@/lib/wanted";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/wanted → the store-wide reader requests list, most requested first. */
export async function GET() {
  return Response.json({ items: sortedWanted().slice(0, 30) });
}
