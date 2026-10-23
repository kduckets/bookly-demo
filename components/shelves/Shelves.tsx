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
      <div role="list" aria-label={`${label} shelf`} className="thin-scroll flex items-end gap-1 overflow-x-auto border-b-2 border-stone-300 px-1 pt-8">
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
      </div>
    </div>
  );
}
