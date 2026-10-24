"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG, SECTIONS } from "@/data/catalog";
import { SpineArt } from "@/components/book/Spine";
import { useStore } from "@/components/store/StoreContext";
import type { Book } from "@/lib/types";
import { matches } from "./filtering";

export function Shelves() {
  const { filters, highlight } = useStore();
  const [lit, setLit] = useState<string | null>(null);

  // When the clerk finds a book: scroll to it, pull it out, and leave it out for a while.
  useEffect(() => {
    if (!highlight) return;
    setLit(highlight.bookId);
    const t1 = window.setTimeout(() => {
      document.querySelector(`[data-book-id="${highlight.bookId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 60);
    const t2 = window.setTimeout(() => setLit(null), 12000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [highlight]);

  const visible = useMemo(() => CATALOG.filter((b) => matches(b, filters)), [filters]);

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 pb-16 sm:px-6">
      {SECTIONS.map((sec) => {
        const books = visible.filter((b) => b.section === sec.id);
        if (!books.length) return null;
        return (
          <section key={sec.id} id={`aisle-${sec.aisle}`} aria-labelledby={`h-${sec.id}`} className="scroll-mt-24">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id={`h-${sec.id}`} className="text-xl font-semibold tracking-tight">
                {sec.label}
              </h2>
              <span className="text-sm text-stone-500">
                Aisle {sec.aisle} · {books.length} books
              </span>
            </div>
            <ShelfRow label={sec.label} books={books} lit={lit} />
          </section>
        );
      })}
      {!visible.length && <p className="py-20 text-center text-stone-500">No books match those filters.</p>}
    </div>
  );
}

function ShelfRow({ label, books, lit }: { label: string; books: Book[]; lit: string | null }) {
  const { setSelectedBookId } = useStore();
  const [focusIdx, setFocusIdx] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (i: number) => {
    const n = (i + books.length) % books.length;
    setFocusIdx(n);
    refs.current[n]?.focus();
  };

  return (
    <div>
      {/* Back panel, books, then the shelf board with a soft shadow beneath it. */}
      <div
        role="list"
        aria-label={`${label} shelf`}
        className="thin-scroll flex items-end gap-[3px] overflow-x-auto rounded-t-xl bg-gradient-to-b from-stone-100/80 to-stone-200/50 px-4 pt-10 ring-1 ring-inset ring-stone-200/80"
      >
        {books.map((b, i) => (
          <div role="listitem" key={b.id} className="flex-none">
            <button
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className="spine-btn"
              data-book-id={b.id}
              data-highlight={b.id === lit}
              tabIndex={i === focusIdx ? 0 : -1}
              aria-label={`${b.title} by ${b.author}, ${b.year}. Open details.`}
              onFocus={() => setFocusIdx(i)}
              onClick={() => setSelectedBookId(b.id)}
              onKeyDown={(e) => {
                const target = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: books.length - 1 }[e.key];
                if (target === undefined) return;
                e.preventDefault();
                move(target);
              }}
            >
              <SpineArt book={b} />
            </button>
          </div>
        ))}
        <Bookend />
      </div>
      <div aria-hidden className="h-3.5 rounded-b-md border-t border-white/70 bg-gradient-to-b from-stone-300 to-stone-400/80 shadow-[0_12px_16px_-10px_rgba(28,25,23,0.4)]" />
    </div>
  );
}

/** A slim, minimal bookend at the end of each row. */
function Bookend() {
  return (
    <div aria-hidden className="ml-3 h-[120px] w-3 flex-none rounded-t-md bg-gradient-to-r from-stone-300 via-stone-400 to-stone-500 shadow-[2px_0_4px_-1px_rgba(28,25,23,0.25)]" />
  );
}
