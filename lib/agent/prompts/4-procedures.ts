/**
 * Layer 4 — Procedures (editable from the gear panel's Procedures tab).
 * Plain-language workflow instructions for returns, exchanges, gift cards, and reader requests.
 * The text lives in lib/agent/procedures/*.md; edits are versioned per shopper. Each procedure
 * carries a read-only "Enforced in code" list, and the block ends with a note that procedures
 * can't change policy, tool rules, or anything enforced in code.
 */
export { proceduresBlock, changedProceduresBlock, PROCEDURES_NOTE } from "../procedures";
