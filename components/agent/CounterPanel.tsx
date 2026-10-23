"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store/StoreContext";
import { Cards } from "./Cards";
import { CloseIcon, GearIcon } from "./Icons";
import { Markdownish } from "./Markdownish";
import { Suggestions } from "./Suggestions";
import { Trace } from "./Trace";

/** The conversation panel. Docked on the right so the shelves stay visible. */
export function CounterPanel() {
  const { chatOpen, setChatOpen, messages, send, sending, locked, turn, settings, setSettingsOpen, newConversation } = useStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatOpen && !sending) inputRef.current?.focus({ preventScroll: true });
  }, [chatOpen, sending]);

  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="dialog"]') && setChatOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen, setChatOpen]);

  if (!chatOpen) return null;

  const submit = () => {
    if (!text.trim() || sending || locked) return;
    send(text);
    setText("");
  };
  const lastAgent = [...messages].reverse().find((m) => m.role === "agent")?.id;

  return (
    <aside
      aria-label="Conversation with the Ice-Nine Bookshop clerk"
      className="slide-in-right fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 flex flex-col border-l border-stone-200 bg-white md:left-auto md:w-[var(--panel-w)]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 px-5 py-3">
        <div>
          <h2 className="font-semibold">Ice-Nine Bookshop</h2>
          <p className="text-xs text-stone-500">AI clerk · a Bookly shop · {turn.turn}/{turn.limit} messages</p>
        </div>
        <div className="flex items-center gap-1 text-stone-400">
          <button type="button" onClick={newConversation} className="rounded-full px-3 py-1 text-xs hover:bg-stone-100 hover:text-stone-900">
            New chat
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="rounded-full p-1.5 hover:bg-stone-100 hover:text-stone-900" aria-label="Clerk settings">
            <GearIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setChatOpen(false)} className="rounded-full p-1.5 hover:bg-stone-100 hover:text-stone-900" aria-label="Close chat">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={listRef} className="thin-scroll flex-1 space-y-6 overflow-y-auto px-5 py-5" aria-live="polite" aria-busy={sending}>
        {messages.length === 0 && (
          <div className="fade-in pt-8 text-center">
            <p className="text-lg font-medium">How can I help?</p>
            <p className="mt-1 text-sm text-stone-500">Find a book, get a recommendation, or sort out an order.</p>
            <Suggestions className="mt-6" center />
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-stone-900 px-4 py-2 text-[15px] text-white">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="fade-in">
              <div className={`text-[15px] leading-relaxed text-stone-800 ${m.pending ? "caret" : ""}`}>
                {m.text ? <Markdownish text={m.text} /> : m.pending ? <span className="text-stone-400">Thinking</span> : null}
              </div>
              {m.error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{m.error}</p>}
              <Cards events={m.cards} isLatest={m.id === lastAgent && !m.pending} />
              {settings.showTrace && <Trace events={m.trace} />}
            </div>
          ),
        )}
      </div>

      <div className="border-t border-stone-200 p-3">
        {locked ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-100 px-4 py-3">
            <p className="text-sm">A person from our team will take it from here.</p>
            <button type="button" onClick={newConversation} className="flex-none rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700">
              New chat
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 rounded-2xl border border-stone-200 p-1.5 focus-within:border-stone-400"
          >
            <label htmlFor="counter-input" className="sr-only">Message the clerk</label>
            <textarea
              id="counter-input"
              ref={inputRef}
              rows={1}
              value={text}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Message the clerk"
              className="thin-scroll max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] placeholder:text-stone-400 focus:outline-none"
            />
            <button type="submit" disabled={sending || !text.trim()} className="h-9 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-30">
              Send
            </button>
          </form>
        )}
        {text.length > 800 && <p className="mt-1 text-right text-xs text-stone-400">{text.length}/1000</p>}
      </div>
    </aside>
  );
}
