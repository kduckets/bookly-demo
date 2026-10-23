"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/components/store/StoreContext";
import { Cover } from "@/components/book/Cover";
import { getBook } from "@/data/catalog";

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, send } = useStore();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cartOpen) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;
  const shipping = cart.subtotal > 35 || cart.items.every((i) => i.format === "ebook") ? 0 : 4.99;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your cart">
      <button type="button" aria-label="Close cart" className="fade-in absolute inset-0 bg-stone-900/30" onClick={() => setCartOpen(false)} />
      <aside className="slide-in-right absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-lg font-semibold">Cart</h2>
          <button ref={ref} type="button" onClick={() => setCartOpen(false)} className="text-sm text-stone-500 hover:text-stone-900">Close</button>
        </header>
        <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">
          {cart.items.length === 0 && <p className="py-10 text-center text-stone-500">Your cart is empty.</p>}
          <ul className="space-y-4">
            {cart.items.map((i) => {
              const b = getBook(i.bookId);
              return (
                <li key={`${i.bookId}-${i.format}`} className="flex gap-3">
                  {b && <Cover book={b} className="w-12 flex-none !rounded" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{i.title}</p>
                    <p className="text-sm text-stone-500">{i.author}</p>
                    <p className="mt-1 text-sm capitalize text-stone-600">{i.format} · {i.quantity} × ${i.unitPrice.toFixed(2)}</p>
                  </div>
                  <button type="button" onClick={() => removeFromCart(i.bookId, i.format)} className="self-start text-sm text-stone-400 hover:text-stone-900" aria-label={`Remove ${i.title}`}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {cart.items.length > 0 && (
          <footer className="space-y-1 border-t border-stone-200 px-5 py-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${cart.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-stone-500"><span>Shipping</span><span>{shipping ? `$${shipping.toFixed(2)}` : "Free"}</span></div>
            <button
              type="button"
              onClick={() => {
                setCartOpen(false);
                send("I'd like to check out.");
              }}
              className="!mt-4 w-full rounded-full bg-stone-900 py-3 font-medium text-white hover:bg-stone-700"
            >
              Check out with the clerk
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
