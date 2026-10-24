import { IDENTITY } from "./1-identity";
import { GUARDRAILS } from "./2-guardrails";
import { TOOL_RULES } from "./3-tool-rules";
import { personaBlock } from "./5-persona";

export { DEFAULT_PERSONA } from "./5-persona";
export { sessionContext } from "./6-session-context";

/**
 * Layers 1–5 form the top-level system prompt, frozen when the session starts:
 *   1 identity · 2 guardrails · 3 tool rules (fixed) · 4 procedures · 5 persona (editable).
 * Layer 6 (session context) is appended each turn as a mid-conversation system message, and
 * carries any procedure or persona edits made mid-conversation.
 * Order matters: fixed rules first; editable layers after them, each explicitly subordinate.
 */
export function buildSystemPrompt(persona: string, procedures: string): string {
  return [IDENTITY, GUARDRAILS, TOOL_RULES, procedures, personaBlock(persona)].join("\n\n");
}
