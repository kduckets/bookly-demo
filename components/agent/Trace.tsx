import type { TraceEvent } from "@/lib/types";

type Tone = "good" | "warn" | "bad" | "info";
const TONE: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  bad: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

/** The moments worth pointing at on camera, in the order they happened. */
function keyMoments(events: TraceEvent[]): { label: string; tone: Tone }[] {
  const out: { label: string; tone: Tone }[] = [];
  for (const e of events) {
    if (e.type === "match") out.push({ label: `match: ${e.verdict}`, tone: e.verdict === "ambiguous" ? "warn" : e.verdict === "none" ? "bad" : "good" });
    if (e.type === "guardrail") {
      if (e.rule === "disambiguation_gate") out.push({ label: e.detail.startsWith("blocked") ? "gate: blocked" : "gate: passed", tone: e.detail.startsWith("blocked") ? "bad" : "good" });
      if (e.rule === "disambiguation_pick") out.push({ label: "customer picked", tone: "info" });
      if (e.rule === "confirm_gate") {
        const d = e.detail;
        out.push(d.includes("preview shown") ? { label: "confirm: preview", tone: "warn" } : d.includes("passed") ? { label: "confirm: passed", tone: "good" } : { label: "confirm: blocked", tone: "bad" });
      }
      if (e.rule === "handoff") out.push({ label: "handoff", tone: "info" });
      if (e.rule === "handoff_offered") out.push({ label: e.detail.includes("appended") ? "handoff offered (added)" : "handoff offered", tone: "info" });
      if (e.rule === "handoff_accepted") out.push({ label: "offer accepted", tone: "info" });
      if (e.rule === "open_library" && e.detail.includes("cache")) out.push({ label: "open library: cache", tone: "warn" });
      if (e.rule === "off_topic_redirect") out.push({ label: "off-topic redirect", tone: "info" });
    }
    if (e.type === "tool_call" && e.name === "check_return_eligibility") {
      const m = e.output.match(/"return_eligible":(true|false)/);
      if (m) out.push({ label: m[1] === "true" ? "eligible" : "not eligible", tone: m[1] === "true" ? "good" : "bad" });
    }
    if (e.type === "output_check") out.push(e.sanitized ? { label: "output check: cleaned", tone: "bad" } : e.passed ? { label: e.regenerated ? "output check: passed on retry" : "output check: passed", tone: e.regenerated ? "warn" : "good" } : { label: "output check: failed", tone: "bad" });
    if (e.type === "procedure") out.push({ label: `procedure: ${e.id} v${e.version}`, tone: e.edited ? "warn" : "info" });
  }
  // A failed first check followed by a pass reads as one "passed on retry" chip.
  return out.filter((m, i) => !(m.label === "output check: failed" && out[i + 1]?.label.startsWith("output check")));
}

/** The agent's work for one turn, made visible. Maps 1:1 onto the architecture diagram. */
export function Trace({ events }: { events: TraceEvent[] }) {
  if (!events.length) return null;
  const pre = events.find((e) => e.type === "precheck");
  const turn = events.find((e) => e.type === "turn");
  const tools = events.filter((e) => e.type === "tool_call");
  const tokens = turn && turn.type === "turn" ? turn.inputTokens + turn.outputTokens : 0;
  const moments = keyMoments(events);
  return (
    <details className="mt-2 rounded-lg border border-stone-200 bg-stone-50 font-mono text-[11px] text-stone-500">
      <summary className="cursor-pointer select-none px-2 py-1.5 hover:text-stone-900">
        trace · {pre?.type === "precheck" ? pre.label : "—"} · {tools.length} tool{tools.length === 1 ? "" : "s"}
        {turn?.type === "turn" && ` · ${(turn.ms / 1000).toFixed(1)}s · ${(tokens / 1000).toFixed(1)}k tok`}
        {moments.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1 font-sans">
            {moments.map((m, i) => (
              <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TONE[m.tone]}`}>
                {m.label}
              </span>
            ))}
          </span>
        )}
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
