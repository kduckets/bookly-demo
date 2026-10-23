import type { WantedItem } from "@/lib/types";
import { normalize } from "@/lib/agent/tools/util";

/**
 * The store-wide "Reader requests" list: books customers asked for that Bookly doesn't stock.
 * In memory for the prototype; shared by every session. Seeded so the list isn't empty on day one.
 */

const g = globalThis as unknown as { __booklyWanted?: WantedItem[] };

function seed(): WantedItem[] {
  const now = Date.now();
  return [
    { id: "w-station-eleven", title: "Station Eleven", author: "Emily St. John Mandel", year: 2014, openLibraryKey: "/works/OL17202418W", requests: 3, reasons: ["Post-apocalyptic, but hopeful. Fits next to Canticle."], lastRequestedAt: new Date(now - 2 * 86_400_000).toISOString() },
    { id: "w-three-body", title: "The Three-Body Problem", author: "Liu Cixin", year: 2006, requests: 2, reasons: ["Asked for after Foundation."], lastRequestedAt: new Date(now - 5 * 86_400_000).toISOString() },
  ];
}

export function wantedList(): WantedItem[] {
  if (!g.__booklyWanted) g.__booklyWanted = seed();
  return g.__booklyWanted;
}

export function resetWanted() {
  g.__booklyWanted = undefined;
}

const keyOf = (title: string, author: string) => `${normalize(title.split(":")[0]).replace(/^(the|a|an) /, "")}|${normalize(author).split(" ").pop()}`;

/** Add a request, or bump the count if the book is already on the list. */
export function addWanted(input: { title: string; author: string; year?: number; openLibraryKey?: string; reason?: string }): { item: WantedItem; added: boolean } {
  const list = wantedList();
  const k = keyOf(input.title, input.author);
  const existing = list.find((w) => keyOf(w.title, w.author) === k);
  const reason = input.reason?.trim().slice(0, 200);
  const now = new Date().toISOString();
  if (existing) {
    existing.requests += 1;
    existing.lastRequestedAt = now;
    if (reason) existing.reasons = [...existing.reasons, reason].slice(-5);
    if (!existing.openLibraryKey && input.openLibraryKey) existing.openLibraryKey = input.openLibraryKey;
    return { item: existing, added: false };
  }
  const item: WantedItem = {
    id: `w-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title.trim().slice(0, 160),
    author: input.author.trim().slice(0, 80),
    year: input.year,
    openLibraryKey: input.openLibraryKey,
    requests: 1,
    reasons: reason ? [reason] : [],
    lastRequestedAt: now,
  };
  list.push(item);
  return { item, added: true };
}

export function sortedWanted(): WantedItem[] {
  return [...wantedList()].sort((a, b) => b.requests - a.requests || b.lastRequestedAt.localeCompare(a.lastRequestedAt));
}
