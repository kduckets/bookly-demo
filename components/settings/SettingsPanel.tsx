"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, useStore } from "@/components/store/StoreContext";
import { CloseIcon } from "@/components/agent/Icons";
import { ProceduresTab } from "./ProceduresTab";

const MAX = 1500;

/** Demo controls. The persona box changes voice only; rules live in fixed prompt layers and in code. */
export function SettingsPanel() {
  const {
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    newConversation,
  } = useStore();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"persona" | "procedures">("persona");

  useEffect(() => {
    if (!settingsOpen) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setSettingsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, setSettingsOpen]);

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <button
        type="button"
        aria-label="Close settings"
        className="fade-in absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}
      />
      <div className="rise-in relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold">
              Clerk settings
            </h2>
            <p className="text-sm text-stone-500">
              For demos. Edits are kept for this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div
          className="mt-4 flex gap-1 border-b border-stone-200"
          role="tablist"
          aria-label="Settings sections"
        >
          {(
            [
              ["persona", "Persona & demo"],
              ["procedures", "Procedures"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === key ? "border-stone-900 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-900"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "procedures" ? (
          <div className="mt-5">
            <ProceduresTab />
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-baseline justify-between">
              <label htmlFor="persona" className="text-sm font-medium">
                Tone and persona
              </label>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    persona: DEFAULT_SETTINGS.persona,
                  })
                }
                className="text-xs text-stone-500 hover:text-stone-900"
              >
                Reset to default
              </button>
            </div>
            <textarea
              id="persona"
              ref={ref}
              value={settings.persona}
              maxLength={MAX}
              rows={7}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  persona: e.target.value.slice(0, MAX),
                })
              }
              className="thin-scroll mt-2 w-full resize-y rounded-xl border border-stone-200 p-3 text-sm leading-relaxed focus:border-stone-900 focus:outline-none"
            />
            <div className="mt-1 flex justify-between gap-4 text-xs text-stone-500">
              <span>
                Changes voice only. Policies, tools, and limits are enforced
                separately.
              </span>
              <span className="flex-none">
                {settings.persona.length}/{MAX}
              </span>
            </div>

            <div className="mt-6 space-y-4 border-t border-stone-200 pt-5">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">
                    Show agent trace
                  </span>
                  <span className="block text-xs text-stone-500">
                    Pre-check, tool calls, slots, tokens, latency
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.showTrace}
                  onChange={(e) =>
                    setSettings({ ...settings, showTrace: e.target.checked })
                  }
                  className="h-4 w-4 accent-stone-900"
                />
              </label>
              <label className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Turn limit</span>
                  <span className="block text-xs text-stone-500">
                    3 to 12. The server never allows more than 12.
                  </span>
                </span>
                <input
                  type="number"
                  min={3}
                  max={12}
                  value={settings.turnLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      turnLimit: Math.max(
                        3,
                        Math.min(12, Number(e.target.value) || 12),
                      ),
                    })
                  }
                  className="h-9 w-16 rounded-lg border border-stone-200 px-2 text-sm focus:border-stone-900 focus:outline-none"
                />
              </label>
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-stone-200 pt-4">
          <p className="text-xs text-stone-500">
            Persona and procedure edits apply from your next message.
          </p>
          <button
            type="button"
            onClick={() => {
              newConversation();
              setSettingsOpen(false);
            }}
            className="flex-none rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            New conversation
          </button>
        </div>
      </div>
    </div>
  );
}
