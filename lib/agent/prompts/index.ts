import { IDENTITY } from "./1-identity";
import { GUARDRAILS } from "./2-guardrails";
import { TOOL_RULES } from "./3-tool-rules";
import { personaBlock } from "./4-persona";

export { DEFAULT_PERSONA } from "./4-persona";
export { sessionContext } from "./5-session-context";

/**
 * Layers 1–4 form the top-level system prompt, frozen when the session starts.
 * Layer 5 (session context) is appended each turn as a mid-conversation system message.
 * Order matters: fixed rules first, the editable persona last and explicitly subordinate.
 */
export function buildSystemPrompt(persona: string): string {
  return [IDENTITY, GUARDRAILS, TOOL_RULES, personaBlock(persona)].join("\n\n");
}
