import { CATALOG } from "@/data/catalog";
import { normalize } from "@/lib/agent/tools/util";
import type { ExternalBook } from "@/lib/types";

/**
 * A small Open Library client (https://openlibrary.org/developers/api).
 * Follows their usage guidelines: requests are made only on behalf of a customer's question,
 * responses are cached, and requests identify the app with a User-Agent (plus a contact email
 * when OPEN_LIBRARY_CONTACT_EMAIL is set).
 */

const BASE = "https://openlibrary.org";
const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 6000;

const g = globalThis as unknown as { __olCache?: Map<string, { at: number; data: unknown }> };
const cache = (g.__olCache ??= new Map());

function userAgent() {
  const email = process.env.OPEN_LIBRARY_CONTACT_EMAIL;
  return `BooklyDemo/0.1 (customer-support prototype${email ? `; ${email}` : ""})`;
}

async function getJSON(path: string): Promise<unknown> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": userAgent(), Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  const data = await res.json();
  cache.set(path, { at: Date.now(), data });
  return data;
}

/** Keep subject tags that read like topics; drop shelving codes, list tags, and noise. */
const NOISE = /^(fiction|literature|large type books|accessible book|protected daisy|in library|lending library|open library staff picks|english|american|novel|fiction, general)$/i;
export function cleanSubjects(subjects: unknown, max = 12): string[] {
  if (!Array.isArray(subjects)) return [];
  const out: string[] = [];
  for (const s of subjects) {
    if (typeof s !== "string") continue;
    const t = s.trim();
    if (!t || t.length > 40 || /[:=/]/.test(t) || NOISE.test(t)) continue;
    if (!out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

const lastName = (a: string) => normalize(a).split(" ").pop() ?? "";

/**
 * Is this Open Library work one we already stock?
 * - Exact title (subtitle dropped) and a matching author surname, or
 * - exact distinctive title alone (two or more words and 10+ characters; author names vary by script), or
 * - the same title ignoring a leading article, or a longer edition title, with the surname matching.
 * "The Invisible Man" (Wells) must not match "Invisible Man" (Ellison).
 */
export function catalogMatch(title: string, authors: string[]): string | null {
  const ot = normalize(title.split(":")[0]);
  const noArticle = (t: string) => t.replace(/^(the|a|an) /, "");
  const surnames = authors.map(lastName);
  const b = CATALOG.find((c) => {
    const ct = normalize(c.title.split(":")[0]);
    const surnameOk = surnames.includes(lastName(c.author));
    if (ot === ct) return surnameOk || (ct.length >= 10 && ct.includes(" ")) || surnames.length === 0;
    return surnameOk && (noArticle(ot) === noArticle(ct) || ot.startsWith(ct + " "));
  });
  return b?.id ?? null;
}

/** Prefer the English edition's title (Open Library works often carry the original-language title). */
function englishTitle(raw: Record<string, unknown>): string | null {
  const ed = (raw.editions as { docs?: { title?: unknown; language?: unknown }[] } | undefined)?.docs?.[0];
  const t = ed && typeof ed.title === "string" && Array.isArray(ed.language) && ed.language.includes("eng") ? ed.title : null;
  if (!t) return null;
  return t === t.toLowerCase() ? t.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(A|An|The|Of|And|In|On|To|For|With|Who)\b(?!$)/g, (w, _x, i) => (i === 0 ? w : w.toLowerCase())) : t;
}

function toExternal(raw: Record<string, unknown>): ExternalBook | null {
  const title = (englishTitle(raw) ?? (typeof raw.title === "string" ? raw.title : null))?.slice(0, 160) ?? null;
  const key = typeof raw.key === "string" ? raw.key : null;
  if (!title || !key) return null;
  const authors = Array.isArray(raw.author_name)
    ? (raw.author_name as unknown[]).filter((a): a is string => typeof a === "string")
    : Array.isArray(raw.authors)
      ? (raw.authors as { name?: unknown }[]).map((a) => a?.name).filter((a): a is string => typeof a === "string")
      : [];
  return {
    key,
    title,
    authors: authors.slice(0, 3).map((a) => a.slice(0, 80)),
    year: typeof raw.first_publish_year === "number" ? raw.first_publish_year : undefined,
    subjects: cleanSubjects(raw.subject),
    url: `${BASE}${key}`,
    booklyBookId: catalogMatch(title, authors),
  };
}

const FIELDS = "key,title,author_name,first_publish_year,subject,edition_count,editions,editions.title,editions.language";

export async function searchWorks(opts: { query?: string; author?: string; subject?: string; limit?: number }): Promise<ExternalBook[]> {
  const p = new URLSearchParams();
  if (opts.query) p.set("q", opts.query);
  if (opts.author) p.set("author", opts.author);
  if (opts.subject) p.set("subject", opts.subject);
  p.set("lang", "en");
  p.set("fields", FIELDS);
  p.set("limit", String(Math.min(10, Math.max(1, opts.limit ?? 6))));
  const data = (await getJSON(`/search.json?${p}`)) as { docs?: Record<string, unknown>[] };
  return (data.docs ?? []).map(toExternal).filter((b): b is ExternalBook => !!b);
}

/** Popular works on a subject that have an English edition. */
export async function subjectWorks(subject: string, limit = 8): Promise<ExternalBook[]> {
  const clean = subject.replace(/["\\]/g, "").trim().slice(0, 60);
  if (!clean) return [];
  const p = new URLSearchParams({ q: `subject:"${clean}" language:eng`, lang: "en", sort: "editions", fields: FIELDS, limit: String(Math.min(12, limit)) });
  const data = (await getJSON(`/search.json?${p}`)) as { docs?: Record<string, unknown>[] };
  return (data.docs ?? []).map(toExternal).filter((b): b is ExternalBook => !!b);
}
