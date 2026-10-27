"use client";

import { useState } from "react";
import { getBook } from "@/data/catalog";
import { Cover } from "@/components/book/Cover";
import { useStore } from "@/components/store/StoreContext";
import type { BookSummary, ExternalBook, Format, OrderView, UIEvent } from "@/lib/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  processing: { label: "Processing", cls: "bg-amber-50 text-amber-700" },
  shipped: { label: "In transit", cls: "bg-sky-50 text-sky-700" },
  delivered: { label: "Delivered", cls: "bg-emerald-50 text-emerald-700" },
  lost_in_transit: { label: "Lost in transit", cls: "bg-rose-50 text-rose-700" },
};

const daysAgo = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : null);
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
const card = "rounded-xl border border-stone-200 bg-white p-3";

/** Structured results from one turn, grouped and de-duplicated. */
export function Cards({ events, isLatest }: { events: UIEvent[]; isLatest: boolean }) {
  const books = new Map<string, BookSummary>();
  for (const e of events) if (e.type === "book_cards") for (const b of e.books) books.set(b.id, b);
  const highlight = [...events].reverse().find((e) => e.type === "highlight_book");
  const external = new Map<string, ExternalBook>();
  for (const e of events) if (e.type === "external_books") for (const b of e.books) external.set(b.key, b);
  const wanted = events.filter((e): e is Extract<UIEvent, { type: "wanted_list_updated" }> => e.type === "wanted_list_updated");
  const rest = events.filter((e) => !["book_cards", "highlight_book", "cart_updated", "session_locked", "external_books", "wanted_list_updated"].includes(e.type));
  const seen = new Set<string>();
  const deduped = [...rest]
    .reverse()
    .filter((e) => {
      const k = e.type === "confirmation" ? `c-${e.kind}` : e.type === "order_card" ? `o-${e.order.orderId}` : e.type;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .reverse();

  if (!books.size && !highlight && !deduped.length && !external.size && !wanted.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {highlight?.type === "highlight_book" && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden /> Highlighted on the shelf · {highlight.location}
        </p>
      )}
      {books.size > 0 && (
        <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[...books.values()].slice(0, 6).map((b) => (
            <BookMini key={b.id} book={b} />
          ))}
        </div>
      )}
      {external.size > 0 && <ExternalList books={[...external.values()].slice(0, 6)} />}
      {wanted.map((w) => (
        <p key={w.item.id + w.item.requests} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          ✓ {w.added ? "Added to reader requests" : "Request counted"} · {w.item.title} · {w.item.requests} {w.item.requests === 1 ? "request" : "requests"}
        </p>
      ))}
      {deduped.map((e, i) => {
        if (e.type === "order_card") return <OrderCard key={i} order={e.order} />;
        if (e.type === "order_list")
          return (
            <div key={i} className="space-y-2">
              {e.orders.map((o) => <OrderCard key={o.orderId} order={o} compact />)}
            </div>
          );
        if (e.type === "confirmation") return <ConfirmCard key={i} event={e} active={isLatest} />;
        if (e.type === "handoff") return <HandoffCard key={i} event={e} />;
        if (e.type === "policy_decision") return <DecisionCard key={i} event={e} active={isLatest} />;
        return null;
      })}
    </div>
  );
}

function BookMini({ book }: { book: BookSummary }) {
  const { addToCart, showOnShelf, setSelectedBookId } = useStore();
  const [added, setAdded] = useState<string | null>(null);
  const full = getBook(book.id);
  const fmt: Format = book.inStock ? (book.formats.includes("paperback") ? "paperback" : book.formats[0]) : "ebook";
  return (
    <div className={`${card} w-[180px] flex-none`}>
      <button type="button" onClick={() => setSelectedBookId(book.id)} className="flex w-full gap-2.5 text-left" aria-label={`Open ${book.title}`}>
        {full && <Cover book={full} className="w-11 flex-none !rounded" />}
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm font-medium leading-tight">{book.title}</span>
          <span className="block truncate text-xs text-stone-500">{book.author}</span>
          <span className="mt-0.5 block text-xs text-stone-700">${book.price.toFixed(2)}</span>
        </span>
      </button>
      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          disabled={!book.inStock && !book.formats.includes("ebook")}
          onClick={async () => setAdded((await addToCart(book.id, fmt)) ?? "Added")}
          className="h-7 flex-1 rounded-lg bg-stone-900 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40"
        >
          {added ?? (fmt === "ebook" ? "Add ebook" : "Add")}
        </button>
        <button type="button" onClick={() => showOnShelf(book.id, book.location)} className="h-7 rounded-lg border border-stone-200 px-2 text-xs hover:border-stone-400" aria-label={`Show ${book.title} on the shelf`}>
          Locate
        </button>
      </div>
    </div>
  );
}

function ExternalList({ books }: { books: ExternalBook[] }) {
  const { send, sending, locked } = useStore();
  return (
    <div className={card}>
      <p className="text-xs font-medium text-stone-500">From Open Library · not in our store yet</p>
      <ul className="mt-2 divide-y divide-stone-100">
        {books.map((b) => (
          <li key={b.key} className="flex items-center gap-2 py-1.5">
            <div className="min-w-0 flex-1">
              <a href={b.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">
                {b.title}
              </a>
              <p className="truncate text-xs text-stone-500">
                {b.authors[0] ?? "Unknown author"}
                {b.year ? ` · ${b.year}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={sending || locked}
              onClick={() => send(`Please add ${b.title}${b.authors[0] ? ` by ${b.authors[0]}` : ""} to the reader requests list.`)}
              className="h-7 flex-none rounded-lg border border-stone-200 px-2 text-xs hover:border-stone-400 disabled:opacity-40"
            >
              Request
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderCard({ order, compact }: { order: OrderView; compact?: boolean }) {
  const st = STATUS[order.status] ?? { label: order.status, cls: "bg-stone-100 text-stone-700" };
  const delivered = daysAgo(order.deliveredAt);
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Order {order.orderId}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
      </div>
      <p className="mt-0.5 text-xs text-stone-500">
        Bought on {order.purchasedAt} · {fmtDate(order.placedAt)}
        {delivered != null && ` · delivered ${delivered === 0 ? "today" : `${delivered} days ago`}`}
        {order.status === "shipped" && order.estimatedDelivery && ` · arriving ${fmtDate(order.estimatedDelivery)}`}
      </p>
      <ul className="mt-2 space-y-0.5 text-sm">
        {order.items.map((i) => (
          <li key={i.itemId} className="flex justify-between gap-2">
            <span className="truncate">
              {i.title}
              {i.damaged && <span className="ml-1 text-xs text-rose-600">· damaged</span>}
            </span>
            <span className="text-stone-500">${i.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      {!compact && order.trackingNumber && <p className="mt-2 text-xs text-stone-500">{order.carrier} · {order.trackingNumber}</p>}
    </div>
  );
}

function ConfirmCard({ event, active }: { event: Extract<UIEvent, { type: "confirmation" }>; active: boolean }) {
  const { send, sending, locked } = useStore();
  const done = event.stage === "done";
  return (
    <div className={`${card} ${done ? "border-emerald-200 bg-emerald-50/50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{event.title}</p>
        {done && event.reference && <span className="text-xs font-medium text-emerald-700">✓ {event.reference}</span>}
      </div>
      <ul className="mt-1.5 space-y-0.5 text-sm text-stone-600">
        {event.lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      {!done && active && !locked && (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={sending} onClick={() => send("Yes, please go ahead.")} className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40">
            Confirm
          </button>
          <button type="button" disabled={sending} onClick={() => send("Not yet. I'd like to change something.")} className="h-8 rounded-lg border border-stone-200 px-3 text-xs hover:border-stone-400 disabled:opacity-40">
            Not yet
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionCard({ event, active }: { event: Extract<UIEvent, { type: "policy_decision" }>; active: boolean }) {
  const { send, sending, locked } = useStore();
  return (
    <div className={`${card} border-rose-200 bg-rose-50/40`}>
      <p className="text-sm font-medium text-rose-900">{event.title}</p>
      <ul className="mt-1.5 space-y-0.5 text-sm text-stone-600">
        {event.lines.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 flex-none rounded-full bg-rose-300" aria-hidden />
            {l}
          </li>
        ))}
      </ul>
      {active && !locked && event.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {event.actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              disabled={sending}
              onClick={() => send(a.prompt)}
              className={`h-8 rounded-lg px-3 text-xs font-medium disabled:opacity-40 ${i === 0 ? "bg-stone-900 text-white hover:bg-stone-700" : "border border-stone-200 hover:border-stone-400"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HandoffCard({ event }: { event: Extract<UIEvent, { type: "handoff" }> }) {
  return (
    <div className={`${card} border-sky-200 bg-sky-50/50`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Handed to our team</p>
        <p className="text-xs text-stone-500">Ticket {event.ticketId}</p>
      </div>
      <p className="mt-1.5 text-sm text-stone-600">{event.summary}</p>
      <p className="mt-1.5 text-xs text-stone-500">{event.eta}</p>
    </div>
  );
}
