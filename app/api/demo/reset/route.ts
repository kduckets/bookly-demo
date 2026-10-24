import { resetDemo } from "@/lib/demo-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** POST /api/demo/reset { shopperId } → restores the demo's starting state. */
export async function POST(req: Request) {
  const { shopperId } = (await req.json().catch(() => ({}))) as { shopperId?: unknown };
  if (typeof shopperId !== "string" || !ID_RE.test(shopperId)) return Response.json({ error: "Invalid shopper" }, { status: 400 });
  return Response.json({ ok: true, ...resetDemo(shopperId) });
}
