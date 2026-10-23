import { handleTurn } from "@/lib/agent/loop";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** POST /api/chat → newline-delimited JSON stream of StreamEvents. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { sessionId, shopperId, message, persona, turnLimit } = body;
  if (typeof sessionId !== "string" || !ID_RE.test(sessionId) || typeof shopperId !== "string" || !ID_RE.test(shopperId)) {
    return Response.json({ error: "Missing or invalid session" }, { status: 400 });
  }
  if (typeof message !== "string") return Response.json({ error: "Missing message" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        await handleTurn(
          {
            sessionId,
            shopperId,
            message,
            persona: typeof persona === "string" ? persona : undefined,
            turnLimit: typeof turnLimit === "number" ? turnLimit : undefined,
          },
          emit,
        );
      } catch (err) {
        console.error("[api/chat]", err);
        emit({ type: "error", message: "Something went wrong behind the counter." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
