export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health → whether the clerk can reach the model. Never returns the key itself. */
export async function GET() {
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return Response.json({ hasKey, model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5" });
}
