import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { sendPasswordReset, getPolicy } from "./account";
import { addToCart, checkout, purchaseGiftCard, removeFromCart, viewCart } from "./commerce";
import { findOnShelf, getBookTool, recommend, searchCatalog } from "./discovery";
import { escalateToHuman } from "./escalation";
import { addToReaderRequests, findRelatedBooks, searchOpenLibrary, viewReaderRequests } from "./openlibrary";
import { checkReturnEligibility, initiateExchange, initiateReturn, listOrdersForEmail, lookupOrder } from "./orders";
import type { ToolContext, ToolDef, ToolOutcome } from "./types";
import { checkGate } from "../gate";

/** The full tool registry. Order is fixed so the tools array (and the prompt cache) stays stable. */
export const TOOLS: ToolDef[] = [
  // Discovery
  searchCatalog,
  getBookTool,
  findOnShelf,
  recommend,
  // Open Library & reader requests
  searchOpenLibrary,
  findRelatedBooks,
  addToReaderRequests,
  viewReaderRequests,
  // Commerce
  addToCart,
  removeFromCart,
  viewCart,
  checkout,
  purchaseGiftCard,
  // Orders & post-purchase
  lookupOrder,
  listOrdersForEmail,
  checkReturnEligibility,
  initiateReturn,
  initiateExchange,
  // Account & policy
  sendPasswordReset,
  getPolicy,
  // Escalation
  escalateToHuman,
] as ToolDef[];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

/** JSON-schema tool definitions for the Messages API, generated from the zod schemas. */
export const TOOL_DEFINITIONS: Anthropic.Beta.BetaTool[] = TOOLS.map((t) => {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(t.schema, { io: "input" }) as Record<string, unknown>;
  void _ignored;
  return {
    name: t.name,
    description: t.description,
    input_schema: schema as Anthropic.Beta.BetaTool["input_schema"],
    // Stream tool inputs as they're generated. The server no longer validates them, so
    // executeTool() validates every input against the zod schema before running anything.
    eager_input_streaming: true,
  };
});

/** Validate the model's input against the tool's schema, then run it. Never throws. */
export async function executeTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, data: { error: `Unknown tool ${name}` } };
  const parsed = tool.schema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, data: { error: "Invalid input", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) } };
  }
  // The disambiguation gate: never act on a book or order the customer hasn't settled on.
  const blocked = checkGate(name, parsed.data as Record<string, unknown>, ctx);
  if (blocked) return blocked;
  try {
    return await tool.run(parsed.data, ctx);
  } catch (err) {
    console.error(`[tool ${name}]`, err);
    return { ok: false, data: { error: "The tool failed unexpectedly. Apologize and offer to escalate." } };
  }
}
