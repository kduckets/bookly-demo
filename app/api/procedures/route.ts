import { PROCEDURE_IDS, listProcedures, resetProcedure, revertProcedure, saveProcedure, type ProcedureId } from "@/lib/agent/procedures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** GET /api/procedures?shopperId=… → the four procedures with version info. */
export async function GET(req: Request) {
  const shopperId = new URL(req.url).searchParams.get("shopperId") ?? "";
  if (!ID_RE.test(shopperId)) return Response.json({ error: "Invalid shopper" }, { status: 400 });
  return Response.json({ procedures: listProcedures(shopperId) });
}

/** POST { shopperId, id, action: "save" | "revert" | "reset", text? } → the updated procedure. */
export async function POST(req: Request) {
  const { shopperId, id, action, text } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof shopperId !== "string" || !ID_RE.test(shopperId) || !PROCEDURE_IDS.includes(id as ProcedureId))
    return Response.json({ error: "Invalid request" }, { status: 400 });
  const pid = id as ProcedureId;
  if (action === "save" && typeof text === "string") return Response.json({ procedure: saveProcedure(shopperId, pid, text) });
  if (action === "revert") return Response.json({ procedure: revertProcedure(shopperId, pid) });
  if (action === "reset") return Response.json({ procedure: resetProcedure(shopperId, pid) });
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
