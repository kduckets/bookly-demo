import { Fragment } from "react";

/** A tiny renderer for the clerk's replies: paragraphs, simple lists, **bold**, *italic*. */
function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^(\*[^*]+\*|_[^_]+_)$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdownish({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="my-2 space-y-1 pl-4">
              {lines.map((l, j) => (
                <li key={j} className="list-disc marker:text-stone-400">
                  {inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-2 first:mt-0 last:mb-0">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
