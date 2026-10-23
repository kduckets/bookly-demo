import { z } from "zod";
import { CATALOG, getBook, locationLabel } from "@/data/catalog";
import type { Book } from "@/lib/types";
import { defineTool, fail, ok } from "./types";
import { bookForModel, normalize, resolveBook, summarize } from "./util";

const STOP = new Set(["the", "a", "an", "of", "and", "or", "by", "book", "books", "one", "about", "to", "in", "on", "is", "that", "with", "for", "do", "you", "have"]);

function scoreBook(b: Book, terms: string[]): number {
  const title = normalize(b.title);
  const author = normalize(b.author);
  const themes = b.themes.map(normalize).join(" ");
  const sub = b.subgenres.map(normalize).join(" ");
  const desc = normalize(b.description);
  let s = 0;
  for (const t of terms) {
    if (title.split(" ").includes(t)) s += 5;
    else if (title.includes(t)) s += 3;
    if (author.includes(t)) s += 4;
    if (themes.includes(t)) s += 3;
    if (sub.includes(t)) s += 2;
    if (desc.includes(t)) s += 1;
  }
  return s;
}

export const searchCatalog = defineTool({
  name: "search_catalog",
  description:
    "Search Bookly's catalog. Use for any question about whether we carry a book, finding a title from a vague description, or listing books by author, genre, or theme. Returns only real catalog items with prices, stock, and shelf location. Set display=true to show the results to the customer as cards in the chat (useful when presenting options to choose from).",
  schema: z.object({
    query: z.string().optional().describe("Free-text: title words, author, topic, or description"),
    author: z.string().optional(),
    genre: z.string().optional().describe("Vonnegut, Science Fiction, Classics, or Science & Technology, or a subgenre"),
    themes: z.array(z.string()).optional().describe('e.g. ["war", "free will", "AI"]'),
    max_price: z.number().optional(),
    limit: z.number().int().min(1).max(10).optional(),
    display: z.boolean().optional(),
  }),
  run(input, ctx) {
    const terms = normalize(input.query ?? "")
      .split(" ")
      .filter((t) => t.length > 1 && !STOP.has(t));
    let pool = CATALOG.slice();
    if (input.author) {
      const a = normalize(input.author);
      pool = pool.filter((b) => normalize(b.author).includes(a) || a.split(" ").some((p) => p.length > 2 && normalize(b.author).includes(p)));
    }
    if (input.genre) {
      const g = normalize(input.genre);
      pool = pool.filter(
        (b) => normalize(b.genre).includes(g) || g.includes(normalize(b.genre)) || b.subgenres.some((s) => normalize(s).includes(g)),
      );
    }
    if (input.themes?.length) {
      const ts = input.themes.map(normalize);
      pool = pool.filter((b) => b.themes.some((t) => ts.some((x) => normalize(t).includes(x) || x.includes(normalize(t)))));
    }
    if (input.max_price != null) pool = pool.filter((b) => b.price <= input.max_price!);

    let ranked = pool.map((b) => ({ b, s: terms.length ? scoreBook(b, terms) : 1 }));
    if (terms.length) ranked = ranked.filter((r) => r.s > 0);
    ranked.sort((x, y) => y.s - x.s);
    const results = ranked.slice(0, input.limit ?? 6).map((r) => r.b);

    if (input.display && results.length) ctx.emitUI({ type: "book_cards", books: results.map(summarize) });
    if (!results.length) return ok({ results: [], note: "No catalog matches. Do not suggest books we don't carry as purchasable." });
    return ok({ count: results.length, results: results.map(bookForModel) });
  },
});

export const getBookTool = defineTool({
  name: "get_book",
  description: "Get full details for one catalog book by book_id. Set display=true to show it as a card.",
  schema: z.object({ book_id: z.string(), display: z.boolean().optional() }),
  run(input, ctx) {
    const b = resolveBook(input.book_id);
    if (!b) return fail("Unknown book_id. Use search_catalog to find the right ID.");
    if (input.display) ctx.emitUI({ type: "book_cards", books: [summarize(b)] });
    return ok({ ...bookForModel(b), formats: b.formats, related_ids: b.relatedIds });
  },
});

export const findOnShelf = defineTool({
  name: "find_on_shelf",
  description:
    "Locate a book in the store. Returns its aisle and shelf AND scrolls the customer's screen to that shelf, sliding the book out so they can see it. Use whenever the customer asks where a specific book is, once you know exactly which book they mean.",
  schema: z.object({ book_id: z.string() }),
  run(input, ctx) {
    const b = resolveBook(input.book_id);
    if (!b) return fail("Unknown book_id. Use search_catalog to find the right ID.");
    const location = locationLabel(b);
    ctx.emitUI({ type: "highlight_book", bookId: b.id, location });
    ctx.emitUI({ type: "book_cards", books: [summarize(b)] });
    return ok({ book_id: b.id, title: b.title, location, in_stock: b.stock > 0, highlighted_on_screen: true });
  },
});

export const recommend = defineTool({
  name: "recommend",
  description:
    "Recommend books from Bookly's catalog based on books the customer liked (seed_book_ids) and/or themes they care about. Only returns books we actually carry, and shows them to the customer as cards. Ask what they liked about a book before calling this if it is unclear.",
  schema: z.object({
    seed_book_ids: z.array(z.string()).optional(),
    themes: z.array(z.string()).optional(),
    exclude_ids: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(6).optional(),
  }),
  run(input, ctx) {
    const seeds = (input.seed_book_ids ?? []).map((id) => resolveBook(id)).filter((b): b is Book => !!b);
    const wanted = (input.themes ?? []).map(normalize);
    if (!seeds.length && !wanted.length) return fail("Provide seed_book_ids or themes.");
    const exclude = new Set([...(input.exclude_ids ?? []), ...seeds.map((s) => s.id)]);
    const seedThemes = new Set(seeds.flatMap((s) => s.themes.map(normalize)));
    const related = new Set(seeds.flatMap((s) => s.relatedIds));

    const scored = CATALOG.filter((b) => !exclude.has(b.id)).map((b) => {
      const bt = b.themes.map(normalize);
      let s = 0;
      const why: string[] = [];
      if (related.has(b.id)) {
        s += 4;
        why.push("staff-linked to a book you liked");
      }
      const shared = bt.filter((t) => seedThemes.has(t));
      s += shared.length;
      const matched = bt.filter((t) => wanted.some((w) => t.includes(w) || w.includes(t)));
      s += matched.length * 3;
      const themeHits = [...new Set([...matched, ...shared])].slice(0, 3);
      if (themeHits.length) why.push(`themes: ${themeHits.join(", ")}`);
      if (b.stock === 0) s -= 0.5;
      return { b, s, why };
    });
    const top = scored
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .slice(0, input.limit ?? 4);
    if (!top.length) return ok({ results: [], note: "Nothing in the catalog matches well. Say so honestly." });
    ctx.emitUI({ type: "book_cards", books: top.map((x) => summarize(x.b)) });
    return ok({
      shown_to_customer_as_cards: true,
      results: top.map((x) => ({ ...bookForModel(x.b), why: x.why.join("; ") })),
    });
  },
});

export { getBook };
