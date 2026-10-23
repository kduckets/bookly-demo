"use client";

import { BookDetail } from "@/components/book/BookDetail";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CounterPanel } from "@/components/agent/CounterPanel";
import { Suggestions } from "@/components/agent/Suggestions";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { Filters } from "@/components/shelves/Filters";
import { ReaderRequests } from "@/components/shelves/ReaderRequests";
import { Shelves } from "@/components/shelves/Shelves";
import { Header } from "./Header";
import { StoreProvider, useStore } from "./StoreContext";

function Main() {
  const { chatOpen } = useStore();
  return (
    <main id="top" className={`transition-[padding] duration-300 ${chatOpen ? "md:pr-[var(--panel-w)]" : ""}`}>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6">
        <p className="mb-2 text-sm font-medium text-stone-500">
          Ice-Nine Bookshop <span className="text-stone-300">·</span> a Bookly shop
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Browse the shelves, or just ask.</h1>
        <p className="mt-2 max-w-xl text-stone-500">Ask the clerk above to find something for you, or for help with an existing order: tracking, returns, and exchanges.</p>
        <Suggestions className="mt-5" />
      </section>
      <Filters />
      <div className="h-10" />
      <Shelves />
      <ReaderRequests />
      <footer className="border-t border-stone-200 px-4 py-8 text-center text-xs text-stone-400">
        Ice-Nine Bookshop is part of Bookly. Both are fictional, built as a prototype. Book designs are generated.
      </footer>
    </main>
  );
}

export function Bookstore() {
  return (
    <StoreProvider>
      <Header />
      <Main />
      <CounterPanel />
      <BookDetail />
      <CartDrawer />
      <SettingsPanel />
    </StoreProvider>
  );
}
