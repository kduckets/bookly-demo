"use client";

import { useStore } from "@/components/store/StoreContext";
import { SparkIcon } from "./Icons";

/** One-click starters covering the clerk's main jobs. Short label on the button, full question sent. */
export const SUGGESTIONS = [
  { label: "Find Cat's Cradle", prompt: "Where's Cat's Cradle?" },
  { label: "Books like Dune", prompt: "What should I read after Dune?" },
  { label: "Track my order", prompt: "Where's my order?" },
  { label: "Return a book", prompt: "I want to return a book" },
  { label: "Gift card for Dad", prompt: "I'd like to send my dad a gift card" },
];

export function Suggestions({ className = "", center = false }: { className?: string; center?: boolean }) {
  const { send, sending, locked } = useStore();
  return (
    <div
      role="group"
      aria-label="Suggested questions for the clerk"
      className={`thin-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 ${center ? "sm:justify-center" : ""} ${className}`}
    >
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          disabled={sending || locked}
          onClick={() => send(s.prompt)}
          className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-stone-700 transition hover:border-amber-300 hover:bg-amber-100 hover:text-stone-900 disabled:opacity-40"
        >
          <SparkIcon className="h-3 w-3 text-amber-500" />
          {s.label}
        </button>
      ))}
    </div>
  );
}
