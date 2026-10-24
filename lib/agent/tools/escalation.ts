import { z } from "zod";
import type { Session } from "../session";
import { defineTool, ok, type ToolContext } from "./types";
import { maskEmail, shortId } from "./util";

export const HANDOFF_ETA = "A Bookly team member will reply by email within 2 business hours (Mon–Sat, 8am–8pm ET).";

/** Build a handoff summary from session state, so the customer never has to repeat themselves. */
export function summaryFromSession(s: Session, reason: string): string {
  const parts: string[] = [`Reason: ${reason}.`];
  if (s.actions.length) parts.push(`This session: ${s.actions.join("; ")}.`);
  const known: string[] = [];
  if (s.slots.email) known.push(`email ${maskEmail(s.slots.email)}`);
  if (s.verifiedOrderIds.length) known.push(`verified orders ${s.verifiedOrderIds.join(", ")}`);
  if (known.length) parts.push(`Known: ${known.join("; ")}.`);
  const lastAsk = [...s.transcript].reverse().find((t) => t.role === "user")?.text;
  if (lastAsk) parts.push(`Latest message: “${lastAsk.slice(0, 120)}”.`);
  return parts.join(" ");
}

export function openTicket(ctx: Pick<ToolContext, "session" | "emitUI">, reason: string, summary: string) {
  const ticketId = ctx.session.ticketId ?? shortId("BKLY");
  ctx.session.ticketId = ticketId;
  ctx.emitUI({ type: "handoff", ticketId, summary, eta: HANDOFF_ETA, reason });
  return { ticket_id: ticketId, expected_response: HANDOFF_ETA };
}

export const escalateToHuman = defineTool({
  name: "escalate_to_human",
  description:
    "Hand the conversation to a human Bookly team member. Use when the customer asks for a person, when something needs a policy exception or judgment you can't make (lost packages, out-of-policy requests the customer wants reviewed), or when you're stuck. Write a 2–3 sentence summary a colleague can act on without re-asking anything.",
  schema: z.object({ reason: z.string(), summary: z.string() }),
  run(input, ctx) {
    const s = ctx.session;
    const done = s.actions.length ? ` This session: ${s.actions.join("; ")}.` : "";
    const known = s.verifiedOrderIds.length ? ` Verified orders: ${s.verifiedOrderIds.join(", ")}.` : "";
    return ok(openTicket(ctx, input.reason, `${input.summary.trim()}${done}${known}`));
  },
});
