import type { Book } from "@/lib/types";
import type { Filters } from "@/components/store/StoreContext";

export function decadeOf(year: number): string {
  return year < 1900 ? "Before 1900" : `${Math.floor(year / 10) * 10}s`;
}

export function matches(b: Book, f: Filters): boolean {
  if (f.genre && b.genre !== f.genre) return false;
  if (f.author && b.author !== f.author) return false;
  if (f.decade && decadeOf(b.year) !== f.decade) return false;
  return true;
}
