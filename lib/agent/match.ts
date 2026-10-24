import { CATALOG } from "@/data/catalog";
import type { Book } from "@/lib/types";
import { normalize } from "./tools/util";

/**
 * Match verdicts for book searches. Code decides whether a request points at ONE book or several;
 * the disambiguation gate then refuses to act on a book the customer hasn't settled on.
 *
 *   exact      one book clearly meant: its title was named, or only one book matches strongly
 *   ambiguous  several plausible matches for a description ("the Vonnegut book about the war")
 *   list       a browse by author or genre alone; showing several is the answer
 *   none       nothing matched
 *
 * The one tunable threshold is AMBIGUITY_MARGIN: books scoring within this many points of the top
 * match are candidates. Higher means more clarifying questions; lower means more guessing.
 */

export const AMBIGUITY_MARGIN = 2;
export const MAX_CANDIDATES = 5;

export const STOP = new Set([
  "the", "a", "an", "of", "and", "or", "by", "book", "books", "one", "about", "to", "in", "on", "is", "that", "with",
  "for", "do", "you", "have", "where", "wheres", "s", "it", "find", "me", "i", "looking", "want", "novel", "his", "her",
]);

/** Name tokens of every catalog author. An author narrows the shelf but never picks a book. */
const AUTHOR_TOKENS = new Set(CATALOG.flatMap((b) => normalize(b.author).split(" ").filter((t) => t.length > 1)));

/** Shelf and genre words. On their own they ask for a browse, not a specific book. */
const GENRE_TOKENS = new Set(["science", "fiction", "sci", "fi", "scifi", "sf", "classic", "classics", "technology", "tech", "nonfiction", "music", "biography", "biographies", "memoir", "memoirs"]);

/** Common names for books that differ from the catalog title. */
const ALIASES: Record<string, string> = {
  "1984": "Nineteen Eighty-Four",
  "slaughterhouse 5": "Slaughterhouse-Five",
  "hitchhikers guide": "The Hitchhiker's Guide to the Galaxy",
  "geb": "Gödel, Escher, Bach",
};

/** Add the real title for any alias in the text, so search and title matching both see it. */
export function expandAliases(text: string): string {
  const n = ` ${normalize(text)} `;
  const extra = Object.entries(ALIASES).filter(([a]) => n.includes(` ${normalize(a)} `)).map(([, title]) => title);
  return extra.length ? `${text} ${extra.join(" ")}` : text;
}

/** Catalog books by the author(s) named in the query, if any: "Vonnegut war" only means Vonnegut's books. */
function namedAuthorBooks(query: string | undefined): Set<string> | null {
  const qs = terms(query).filter((t) => AUTHOR_TOKENS.has(t) && t.length > 2);
  if (!qs.length) return null;
  // Prefer authors matching every name word ("Philip K. Dick" isn't Philip Norman); fall back to any.
  const nameOf = (b: Book) => normalize(b.author).split(" ");
  const all = CATALOG.filter((b) => qs.every((t) => nameOf(b).includes(t)));
  const books = all.length ? all : CATALOG.filter((b) => qs.some((t) => nameOf(b).includes(t)));
  return books.length ? new Set(books.map((b) => b.id)) : null;
}

export interface Scored {
  b: Book;
  /** Full score, used to rank results. */
  score: number;
  /** Score without author-name matches, used to judge ambiguity. */
  relevance: number;
}

export function terms(query: string | undefined): string[] {
  return normalize(query ?? "").split(" ").filter((t) => t.length > 1 && !STOP.has(t));
}

export function scoreBook(b: Book, ts: string[]): Scored {
  const title = normalize(b.title);
  const author = normalize(b.author);
  const themes = b.themes.map(normalize).join(" ");
  const sub = b.subgenres.map(normalize).join(" ");
  const desc = normalize(b.description);
  let score = 0;
  let authorPts = 0;
  for (const t of ts) {
    if (title.split(" ").includes(t)) score += 5;
    else if (title.includes(t)) score += 3;
    if (author.includes(t)) {
      score += 4;
      authorPts += 4;
    }
    if (themes.includes(t)) score += 3;
    if (sub.includes(t)) score += 2;
    if (desc.includes(t)) score += 1;
  }
  return { b, score, relevance: score - authorPts };
}

// ─── Titles named in text ─────────────────────────────────────────────────────

const stripArticle = (t: string) => t.replace(/^(the|a|an) /, "");
const FORMS = CATALOG.map((b) => {
  const full = normalize(b.title);
  const short = normalize(b.title.split(":")[0]);
  return { b, forms: [...new Set([full, short, stripArticle(full), stripArticle(short)])].filter((f) => f.length >= 3) };
});

/**
 * Catalog books whose title appears in the text. Short titles ("Dune", "Life", "Code") must appear
 * capitalized as written, or be the whole request, so "my life" or "write code" don't count.
 * A title inside a longer named title is dropped ("Life" inside "The Immortal Life of Henrietta Lacks").
 */
export function titlesIn(rawText: string): Book[] {
  const text = expandAliases(rawText);
  const padded = ` ${normalize(text)} `;
  const bare = terms(text).join(" ");
  const hits: { b: Book; form: string }[] = [];
  for (const { b, forms } of FORMS) {
    const form = forms.find((f) => {
      if (!padded.includes(` ${f} `)) return false;
      if (f.length >= 6) return true;
      const raw = b.title.split(":")[0].replace(/^(The|A|An) /, "");
      return bare === f || new RegExp(`(^|[^A-Za-z])${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`).test(text);
    });
    if (form) hits.push({ b, form });
  }
  return hits.filter((h) => !hits.some((o) => o !== h && o.form.length > h.form.length && o.form.includes(h.form))).map((h) => h.b);
}

// ─── Verdict ─────────────────────────────────────────────────────────────────

export interface Candidate {
  id: string;
  title: string;
  author: string;
  year: number;
}

export interface Verdict {
  match: "exact" | "ambiguous" | "list" | "none";
  resolved_id?: string;
  candidates?: Candidate[];
  reason: string;
}

export const candidate = (b: Book): Candidate => ({ id: b.id, title: b.title, author: b.author, year: b.year });

export function matchVerdict(input: { query?: string; author?: string; themes?: string[] }, allRanked: Scored[]): Verdict {
  // An author named in the query narrows the candidates to that author's books.
  const byAuthor = namedAuthorBooks(input.query);
  const ranked = byAuthor ? allRanked.filter((r) => byAuthor.has(r.b.id)) : allRanked;
  if (!ranked.length) return { match: "none", reason: "no catalog matches" };
  const pool = new Set(ranked.map((r) => r.b.id));

  // 1. A title the customer named always resolves, even if other books share its themes.
  const named = titlesIn(input.query ?? "").filter((b) => pool.has(b.id));
  if (named.length === 1) return { match: "exact", resolved_id: named[0].id, reason: `title named: ${named[0].title}` };
  if (named.length > 1) return { match: "ambiguous", candidates: named.slice(0, MAX_CANDIDATES).map(candidate), reason: "several titles named" };

  // 2. Author or genre alone is a browse: a list is the answer, nothing is picked.
  //    Unless they asked for "the" one ("the Le Guin one"): then it's a question of which.
  const describing = terms(input.query).filter((t) => !AUTHOR_TOKENS.has(t) && !GENRE_TOKENS.has(t));
  if (!describing.length && !input.themes?.length) {
    if (ranked.length === 1) return { match: "exact", resolved_id: ranked[0].b.id, reason: "only one book fits" };
    const wantsOne = /^\W*(the|that)\b.*\b(one|book|novel)\W*$/i.test(input.query ?? "");
    const candidates = ranked.slice(0, MAX_CANDIDATES).map((r) => candidate(r.b));
    return wantsOne
      ? { match: "ambiguous", candidates, reason: "asked for one book by an author with several" }
      : { match: "list", candidates, reason: "browse by author or genre" };
  }

  // 3. A description: books within AMBIGUITY_MARGIN of the best match are all plausible.
  const top = Math.max(...ranked.map((r) => r.relevance));
  const close = ranked.filter((r) => r.relevance > 0 && r.relevance >= top - AMBIGUITY_MARGIN);
  if (close.length <= 1) {
    const only = close[0] ?? ranked[0];
    return { match: "exact", resolved_id: only.b.id, reason: "one book clearly matches the description" };
  }
  return { match: "ambiguous", candidates: close.slice(0, MAX_CANDIDATES).map((r) => candidate(r.b)), reason: `${close.length} books match the description about equally` };
}
