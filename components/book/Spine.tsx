import type { Book } from "@/lib/types";
import { bindingFor } from "@/lib/palette";

/**
 * One book, spine-out. A flat color with a soft cylindrical sheen, and on some books a thin
 * cloth-binding trim: two fine rules, or a darker band near the top. Deterministic per book.
 */
export function SpineArt({ book }: { book: Book }) {
  const b = bindingFor(book.id, book.title);
  const fontSize = Math.max(8, Math.min(13, (b.height - 48) / (book.title.length * 0.55)));
  const rule = b.isLight ? "rgba(28,25,23,0.28)" : "rgba(255,255,255,0.32)";
  return (
    <span
      className="spine relative flex items-start justify-center overflow-hidden rounded-t-[3px] rounded-b-[1px] pt-5"
      style={{
        width: b.width,
        height: b.height,
        color: b.ink,
        background: `linear-gradient(90deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 24%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.18) 100%), ${b.color}`,
      }}
    >
      {b.trim === 1 && (
        <>
          <span aria-hidden className="absolute inset-x-[3px] top-[7px] h-px" style={{ background: rule }} />
          <span aria-hidden className="absolute inset-x-[3px] top-[10px] h-px" style={{ background: rule }} />
          <span aria-hidden className="absolute inset-x-[3px] bottom-[9px] h-px" style={{ background: rule }} />
        </>
      )}
      {b.trim === 2 && <span aria-hidden className="absolute inset-x-0 top-[6px] h-[9px]" style={{ background: "rgba(0,0,0,0.14)" }} />}
      <span
        className="relative max-h-[calc(100%-32px)] overflow-hidden text-ellipsis whitespace-nowrap font-medium tracking-tight [writing-mode:vertical-rl]"
        style={{ fontSize }}
      >
        {book.title}
      </span>
    </span>
  );
}
