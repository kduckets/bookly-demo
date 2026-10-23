"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice, getBook, locationLabel } from "@/data/catalog";
import { useStore } from "@/components/store/StoreContext";
import type { Format } from "@/lib/types";
import { Cover } from "./Cover";

export function BookDetail() {
  const { selectedBookId, setSelectedBookId, addToCart, send } = useStore();
  const book = selectedBookId ? getBook(selectedBookId) : undefined;
  const [format, setFormat] = useState<Format>("paperback");
  const [note, setNote] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!book) return;
    lastFocus.current = document.activeElement;
    const print = book.stock > 0;
    setFormat(book.formats.includes("paperback") && print ? "paperback" : book.formats.includes("hardcover") && print ? "hardcover" : "ebook");
    setNote(null);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedBookId(null);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (lastFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [book, setSelectedBookId]);

  if (!book) return null;
  const printOut = book.stock === 0;
  const unavailable = format !== "ebook" && printOut;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="book-title">
      <button type="button" aria-label="Close" className="fade-in absolute inset-0 cursor-default bg-stone-900/40 backdrop-blur-sm" onClick={() => setSelectedBookId(null)} />
      <div className="rise-in relative grid max-h-[90vh] w-full max-w-3xl gap-6 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:grid-cols-[200px_1fr] sm:p-8">
        <button ref={closeRef} type="button" onClick={() => setSelectedBookId(null)} className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900" aria-label="Close">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>
        <Cover book={book} className="mx-auto w-40 shadow-lg sm:w-full" />
        <div>
          <p className="text-sm text-stone-500">{locationLabel(book)}</p>
          <h2 id="book-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h2>
          <p className="mt-1 text-stone-600">{book.author} · {book.year}</p>
          <p className="mt-4 leading-relaxed text-stone-700">{book.description}</p>

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium">Format</legend>
            <div className="flex flex-wrap gap-2">
              {book.formats.map((f) => (
                <label key={f} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition ${format === f ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 hover:border-stone-400"}`}>
                  <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                  <span className="capitalize">{f}</span> · ${formatPrice(book, f).toFixed(2)}
                </label>
              ))}
            </div>
          </fieldset>
          <p className={`mt-3 text-sm ${printOut ? "text-rose-600" : "text-emerald-600"}`}>
            {printOut ? (book.formats.includes("ebook") ? "Print sold out · ebook available" : "Sold out") : "In stock"}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={unavailable}
              onClick={async () => setNote((await addToCart(book.id, format)) ?? "Added to cart")}
              className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedBookId(null);
                send(`Tell me about ${book.title}. Is it a good place to start?`);
              }}
              className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium hover:border-stone-400"
            >
              Ask about it
            </button>
          </div>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-stone-500">{note}</p>
        </div>
      </div>
    </div>
  );
}
