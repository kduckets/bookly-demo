"use client";

import { AgentBar } from "@/components/agent/AgentBar";
import { BagIcon } from "@/components/agent/Icons";
import { useStore } from "./StoreContext";

export function Header() {
  const { cart, setCartOpen } = useStore();
  return (
    <header className="sticky top-0 z-40 h-[var(--header-h)] border-b border-stone-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <a href="#top" className="flex flex-none items-baseline gap-2" aria-label="Ice-Nine Bookshop, a Bookly shop. Back to top">
          <span className="text-xl font-semibold tracking-tight">Bookly</span>
          <span className="hidden text-stone-300 lg:inline" aria-hidden>/</span>
          <span className="hidden text-sm font-medium text-stone-500 lg:inline">Ice-Nine Bookshop</span>
        </a>
        <div className="mx-auto min-w-0 max-w-2xl flex-1">
          <AgentBar />
        </div>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex-none rounded-full p-2 hover:bg-stone-100"
          aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
        >
          <BagIcon className="h-5 w-5" />
          {cart.count > 0 && (
            <span key={cart.count} className="fade-in absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
              {cart.count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
