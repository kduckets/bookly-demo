import type { z } from "zod";
import type { Session } from "../session";
import type { TraceEvent, UIEvent } from "@/lib/types";

export interface ToolContext {
  session: Session;
  emitUI: (event: UIEvent) => void;
  emitTrace: (event: TraceEvent) => void;
}

export interface ToolOutcome {
  ok: boolean;
  /** JSON-serializable result returned to the model as the tool_result. */
  data: unknown;
  /** When a failure should count toward the "repeated failure" handoff trigger. */
  failureKey?: string;
}

export interface ToolDef<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>, ctx: ToolContext) => ToolOutcome | Promise<ToolOutcome>;
}

export function defineTool<S extends z.ZodType>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

export const ok = (data: unknown): ToolOutcome => ({ ok: true, data });
export const fail = (error: string, failureKey?: string, extra: Record<string, unknown> = {}): ToolOutcome => ({
  ok: false,
  data: { error, ...extra },
  failureKey,
});
