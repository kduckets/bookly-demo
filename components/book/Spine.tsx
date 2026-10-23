import type { Book } from "@/lib/types";
import { bindingFor } from "@/lib/palette";

/** One book, spine-out: a flat color block with the title running down it. */
export function SpineArt({ book }: { book: Book }) {
  const b = bindingFor(book.id, book.title);
  const fontSize = Math.max(8, Math.min(13, (b.height - 40) / (book.title.length * 0.55)));
  return (
    <span
      className="relative flex items-start justify-center overflow-hidden rounded-[3px] pt-3"
      style={{ width: b.width, height: b.height, background: b.color, color: b.ink, boxShadow: "inset 0 0 0 1px #0000000f" }}
    >
      <span className="max-h-[calc(100%-24px)] overflow-hidden text-ellipsis whitespace-nowrap font-medium tracking-tight [writing-mode:vertical-rl]" style={{ fontSize }}>
        {book.title}
      </span>
    </span>
  );
}
