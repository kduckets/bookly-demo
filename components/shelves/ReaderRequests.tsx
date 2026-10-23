"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/store/StoreContext";
import type { WantedItem } from "@/lib/types";

/** Books customers asked us to stock. The clerk adds to this list; the buying team reviews it. */
export function ReaderRequests() {
  const { wantedVersion, send } = useStore();
  const [items, setItems] = useState<WantedItem[]>([]);

  useEffect(() => {
    fetch("/api/wanted")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, [wantedVersion]);

  return (
    <section id="reader-requests" aria-labelledby="h-requests" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="h-requests" className="text-xl font-semibold tracking-tight">Reader requests</h2>
        <span className="text-sm text-stone-500">Not on our shelves yet</span>
      </div>
      <p className="mb-4 max-w-xl text-sm text-stone-500">
        Books customers have asked us to stock. Ask the clerk for something we don&apos;t carry and it can add it here.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-stone-400">No requests yet.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {items.map((w) => (
            <li key={w.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{w.title}</p>
                <p className="truncate text-sm text-stone-500">
                  {w.author}
                  {w.year ? ` · ${w.year}` : ""}
                </p>
              </div>
              <span className="flex-none rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                {w.requests} {w.requests === 1 ? "request" : "requests"}
              </span>
              {w.openLibraryKey && (
                <a href={`https://openlibrary.org${w.openLibraryKey}`} target="_blank" rel="noreferrer" className="hidden flex-none text-xs text-stone-500 hover:text-stone-900 sm:block">
                  Open Library ↗
                </a>
              )}
              <button type="button" onClick={() => send(`I'd like ${w.title} by ${w.author} too. Can you add my request?`)} className="flex-none rounded-full border border-stone-200 px-3 py-1 text-xs hover:border-stone-400">
                +1
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
