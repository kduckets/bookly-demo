import type { Book } from "@/lib/types";
import { bindingFor } from "@/lib/palette";

/** A flat, generated front cover: color block, title, author. No real cover art. */
export function Cover({ book, className }: { book: Pick<Book, "id" | "title" | "author" | "year">; className?: string }) {
  const b = bindingFor(book.id, book.title);
  return (
    <div
      role="img"
      aria-label={`Cover of ${book.title} by ${book.author}`}
      className={`@container relative flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-md p-[8%] ${className ?? ""}`}
      style={{ background: b.color, color: b.ink }}
    >
      <span className="text-[11cqw] font-semibold leading-[1.1] tracking-tight">{book.title}</span>
      <span className="text-[6.5cqw] opacity-75">{book.author}</span>
    </div>
  );
}
