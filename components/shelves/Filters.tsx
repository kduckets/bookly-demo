"use client";

import { useMemo } from "react";
import { CATALOG, SECTIONS } from "@/data/catalog";
import { useStore } from "@/components/store/StoreContext";
import { decadeOf } from "./filtering";

function surname(a: string) {
  const p = a.replace(/ (Jr\.|Sr\.)$/, "").split(" ");
  return p[p.length - 1];
}

const selectCls =
  "h-9 rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 hover:border-stone-300 focus:border-stone-900 focus:outline-none";

export function Filters() {
  const { filters, setFilters } = useStore();
  const { authors, decades } = useMemo(
    () => ({
      authors: [...new Set(CATALOG.map((b) => b.author))].sort((a, b) => surname(a).localeCompare(surname(b))),
      decades: [...new Set(CATALOG.map((b) => decadeOf(b.year)))].sort((a, b) => (a === "Before 1900" ? -1 : b === "Before 1900" ? 1 : a.localeCompare(b))),
    }),
    [],
  );
  const active = Object.values(filters).some(Boolean);
  const chip = (on: boolean) =>
    `h-9 rounded-full px-4 text-sm transition ${on ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300"}`;

  return (
    <section aria-label="Filters" className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 sm:px-6">
      <button type="button" className={chip(!filters.genre)} aria-pressed={!filters.genre} onClick={() => setFilters({ ...filters, genre: null })}>
        All
      </button>
      {SECTIONS.map((s) => (
        <button key={s.id} type="button" className={chip(filters.genre === s.genre)} aria-pressed={filters.genre === s.genre} onClick={() => setFilters({ ...filters, genre: filters.genre === s.genre ? null : s.genre })}>
          {s.label}
        </button>
      ))}
      <span className="mx-1 hidden h-5 w-px bg-stone-200 sm:block" aria-hidden />
      <label className="sr-only" htmlFor="f-author">Author</label>
      <select id="f-author" className={selectCls} value={filters.author ?? ""} onChange={(e) => setFilters({ ...filters, author: e.target.value || null })}>
        <option value="">Any author</option>
        {authors.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="f-decade">Decade</label>
      <select id="f-decade" className={selectCls} value={filters.decade ?? ""} onChange={(e) => setFilters({ ...filters, decade: e.target.value || null })}>
        <option value="">Any decade</option>
        {decades.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      {active && (
        <button type="button" className="h-9 px-2 text-sm text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline" onClick={() => setFilters({ genre: null, author: null, decade: null })}>
          Clear
        </button>
      )}
    </section>
  );
}
