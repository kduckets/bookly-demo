import type { TraceEvent } from "@/lib/types";

/** The agent's work for one turn, made visible. Maps 1:1 onto the architecture diagram. */
export function Trace({ events }: { events: TraceEvent[] }) {
  if (!events.length) return null;
  const pre = events.find((e) => e.type === "precheck");
  const turn = events.find((e) => e.type === "turn");
  const tools = events.filter((e) => e.type === "tool_call");
  const tokens = turn && turn.type === "turn" ? turn.inputTokens + turn.outputTokens : 0;
  return (
    <details className="mt-2 rounded-lg border border-stone-200 bg-stone-50 font-mono text-[11px] text-stone-500">
      <summary className="cursor-pointer select-none px-2 py-1 hover:text-stone-900">
        trace · {pre?.type === "precheck" ? pre.label : "—"} · {tools.length} tool{tools.length === 1 ? "" : "s"}
        {turn?.type === "turn" && ` · ${(turn.ms / 1000).toFixed(1)}s · ${(tokens / 1000).toFixed(1)}k tok`}
      </summary>
      <ol className="space-y-1.5 border-t border-stone-200 px-2 py-2">
        {events.map((e, i) => (
          <li key={i} className="break-words">
            <Row e={e} />
          </li>
        ))}
      </ol>
    </details>
  );
}

function Row({ e }: { e: TraceEvent }) {
  switch (e.type) {
    case "precheck":
      return (
        <span>
          <b className="text-stone-900">pre-check</b> ({e.source}, {e.ms}ms): label=<b>{e.label}</b> intent={e.intent}
          {e.frustrated && " frustrated"}
          {e.wantsHuman && " wants_human"}
        </span>
      );
    case "slots":
      return (
        <span>
          <b className="text-stone-900">slots</b> intent={e.intent} collected={JSON.stringify(e.collected)}
          {e.missing.length > 0 && <> missing=[{e.missing.join(", ")}]</>}
        </span>
      );
    case "tool_call":
      return (
        <span>
          <b className={e.ok ? "text-emerald-600" : "text-rose-600"}>{e.ok ? "✓" : "✗"} {e.name}</b> ({e.ms}ms) {JSON.stringify(e.input)}
          <span className="block pl-3 text-stone-400">→ {e.output}</span>
        </span>
      );
    case "guardrail":
      return (
        <span>
          <b className="text-amber-600">guardrail</b> {e.rule}: {e.detail}
        </span>
      );
    case "match":
      return (
        <span>
          <b className="text-stone-900">match</b> {e.verdict}
          {e.resolved && ` → ${e.resolved}`}
          {e.candidates.length > 0 && ` [${e.candidates.join("; ")}]`} <span className="text-stone-400">({e.reason})</span>
        </span>
      );
    case "procedure":
      return (
        <span>
          <b className="text-stone-900">procedure</b> {e.id} v{e.version}
          {e.edited ? " (edited)" : " (default)"}
        </span>
      );
    case "output_check":
      return (
        <span>
          <b className={e.passed ? "text-emerald-600" : "text-amber-600"}>output check</b>{" "}
          {e.claims.length === 0 ? "no structured claims" : `${e.claims.filter((c) => c.ok).length}/${e.claims.length} claims grounded`}
          {e.regenerated && !e.sanitized && " · regenerated"}
          {e.sanitized && " · unsupported sentences removed"}
          {e.claims.map((c, i) => (
            <span key={i} className={`block pl-3 ${c.ok ? "text-stone-400" : "text-rose-600"}`}>
              {c.ok ? "✓" : "✗"} [{c.kind}] {c.text}
              {c.reason && ` — ${c.reason}`}
            </span>
          ))}
        </span>
      );
    case "turn":
      return (
        <span>
          <b className="text-stone-900">turn</b> {e.turn}/{e.limit} · {e.iterations} model call{e.iterations === 1 ? "" : "s"} · {e.model} · in {e.inputTokens} (cache {e.cacheReadTokens}) · out {e.outputTokens} · {e.ms}ms
        </span>
      );
  }
}
