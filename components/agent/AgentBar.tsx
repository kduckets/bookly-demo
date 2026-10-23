"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/store/StoreContext";
import { GearIcon, SparkIcon } from "./Icons";

export const PLACEHOLDER = "Ask about a book or an order";
const PLACEHOLDER_SHORT = "Ask the clerk";

/** The search bar in the header. Submitting opens the conversation panel. */
export function AgentBar() {
  const { send, sending, setChatOpen, messages, setSettingsOpen, locked } = useStore();
  const [text, setText] = useState("");
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <form
      role="search"
      aria-label="Ask the Ice-Nine Bookshop clerk"
      className="flex w-full items-center rounded-full border border-stone-200 bg-stone-100 transition focus-within:border-stone-400 focus-within:bg-white"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || locked) return setChatOpen(true);
        send(text);
        setText("");
      }}
    >
      <SparkIcon className="ml-4 h-4 w-4 flex-none text-amber-500" />
      <label htmlFor="agent-bar" className="sr-only">Ask the clerk</label>
      <input
        id="agent-bar"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => messages.length && setChatOpen(true)}
        maxLength={1000}
        placeholder={narrow ? PLACEHOLDER_SHORT : PLACEHOLDER}
        autoComplete="off"
        className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[15px] placeholder:text-stone-400 focus:outline-none"
      />
      <button type="button" onClick={() => setSettingsOpen(true)} className="mr-1 rounded-full p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-900" aria-label="Clerk settings">
        <GearIcon className="h-4 w-4" />
      </button>
      <button type="submit" disabled={sending} className="mr-1 hidden h-8 rounded-full bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 sm:block">
        Ask
      </button>
    </form>
  );
}
