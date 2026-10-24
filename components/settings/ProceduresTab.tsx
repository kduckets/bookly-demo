"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/store/StoreContext";

const MAX = 2000;

interface ProcedureView {
  id: string;
  title: string;
  text: string;
  enforced: string[];
  version: number;
  isDefault: boolean;
  history: { version: number; at: string }[];
}

const when = (at: string) => (at === "default" ? "default" : `saved ${new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);

/** Edit how each workflow runs, in plain language. Code-enforced rules are shown but can't be edited. */
export function ProceduresTab() {
  const { shopperId } = useStore();
  const [procs, setProcs] = useState<ProcedureView[]>([]);
  const [selected, setSelected] = useState("returns");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopperId) return;
    fetch(`/api/procedures?shopperId=${shopperId}`)
      .then((r) => r.json())
      .then((d) => setProcs(d.procedures ?? []))
      .catch(() => setError("Couldn't load procedures."));
  }, [shopperId]);

  const current = procs.find((p) => p.id === selected);
  useEffect(() => {
    if (current) setDraft(current.text);
  }, [current?.id, current?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = useCallback(
    async (action: "save" | "revert" | "reset") => {
      setBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/procedures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopperId, id: selected, action, text: action === "save" ? draft : undefined }),
        });
        const d = await r.json();
        if (!r.ok || !d.procedure) throw new Error(d.error ?? "Save failed");
        setProcs((all) => all.map((p) => (p.id === selected ? d.procedure : p)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setBusy(false);
      }
    },
    [shopperId, selected, draft],
  );

  if (!procs.length) return <p className="py-8 text-center text-sm text-stone-500">{error ?? "Loading procedures…"}</p>;
  const dirty = !!current && draft !== current.text;
  const latest = current?.history[current.history.length - 1];

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Procedures">
        {procs.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === selected}
            onClick={() => setSelected(p.id)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${p.id === selected ? "bg-stone-900 text-white" : "border border-stone-200 hover:border-stone-400"}`}
          >
            {p.title}
            <span className={`ml-1.5 text-xs ${p.id === selected ? "text-stone-300" : p.isDefault ? "text-stone-400" : "text-amber-600"}`}>v{p.version}</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="procedure-text" className="text-sm font-medium">
              {current.title} procedure
            </label>
            <span className="text-xs text-stone-500">
              v{current.version} · {current.isDefault ? "default" : `edited, ${when(latest?.at ?? "default")}`}
            </span>
          </div>
          <textarea
            id="procedure-text"
            value={draft}
            maxLength={MAX}
            rows={12}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
            className="thin-scroll mt-2 w-full resize-y rounded-xl border border-stone-200 p-3 font-mono text-[13px] leading-relaxed focus:border-stone-900 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-stone-500">
            <span>{dirty ? "Unsaved changes" : " "}</span>
            <span>
              {draft.length}/{MAX}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!dirty || busy} onClick={() => act("save")} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-30">
              Save as v{current.version + 1}
            </button>
            <button type="button" disabled={current.version === 1 || busy} onClick={() => act("revert")} className="rounded-full border border-stone-200 px-4 py-2 text-sm hover:border-stone-400 disabled:opacity-40">
              Revert to previous
            </button>
            <button type="button" disabled={current.isDefault || busy} onClick={() => act("reset")} className="rounded-full border border-stone-200 px-4 py-2 text-sm hover:border-stone-400 disabled:opacity-40">
              Reset to default
            </button>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>

          <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M6 8V6a4 4 0 1 1 8 0v2h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1Zm2 0h4V6a2 2 0 1 0-4 0v2Z" />
              </svg>
              Enforced in code (read-only)
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-stone-600">
              {current.enforced.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-stone-500">Changes apply to new messages. Code-enforced rules can&apos;t be changed here.</p>
        </div>
      )}
    </div>
  );
}
