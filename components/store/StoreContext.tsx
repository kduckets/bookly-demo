"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PERSONA } from "@/lib/agent/prompts/4-persona";
import { load, newId, save } from "@/lib/client-storage";
import type { Cart, Format, StreamEvent, TraceEvent, UIEvent } from "@/lib/types";

export interface Settings {
  persona: string;
  showTrace: boolean;
  turnLimit: number;
}

export const DEFAULT_SETTINGS: Settings = { persona: DEFAULT_PERSONA, showTrace: false, turnLimit: 12 };

export interface Filters {
  genre: string | null;
  author: string | null;
  decade: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  cards: UIEvent[];
  trace: TraceEvent[];
  pending?: boolean;
  error?: string;
}

interface StoreState {
  ready: boolean;
  cart: Cart;
  addToCart: (bookId: string, format: Format) => Promise<string | null>;
  removeFromCart: (bookId: string, format: Format) => Promise<void>;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;

  highlight: { bookId: string; location: string; nonce: number } | null;
  showOnShelf: (bookId: string, location: string) => void;
  selectedBookId: string | null;
  setSelectedBookId: (id: string | null) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;

  settings: Settings;
  setSettings: (s: Settings) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;

  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  messages: ChatMessage[];
  sending: boolean;
  locked: boolean;
  turn: { turn: number; limit: number };
  send: (text: string) => Promise<void>;
  /** Bumped whenever the clerk changes the reader requests list. */
  wantedVersion: number;
  newConversation: () => void;
}

const EMPTY_CART: Cart = { items: [], subtotal: 0, count: 0 };
const Ctx = createContext<StoreState | null>(null);

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [shopperId, setShopperId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [cartOpen, setCartOpen] = useState(false);
  const [highlight, setHighlight] = useState<StoreState["highlight"]>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ genre: null, author: null, decade: null });
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [turn, setTurn] = useState({ turn: 0, limit: 12 });
  const [wantedVersion, setWantedVersion] = useState(0);
  const sendingRef = useRef(false);

  // Hydrate from localStorage after mount (keeps SSR markup stable).
  useEffect(() => {
    let sid = load<string>("bookly.shopper", "");
    if (!sid) {
      sid = newId("shop");
      save("bookly.shopper", sid);
    }
    setShopperId(sid);
    setSessionId(newId("sess"));
    const stored = load<Partial<Settings>>("bookly.settings", {});
    setSettingsState({ ...DEFAULT_SETTINGS, ...stored });
    setTurn((t) => ({ ...t, limit: stored.turnLimit ?? 12 }));
    fetch(`/api/cart?shopperId=${sid}`)
      .then((r) => r.json())
      .then((d) => d.cart && setCart(d.cart))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    save("bookly.settings", s);
  }, []);

  const showOnShelf = useCallback((bookId: string, location: string) => {
    setFilters({ genre: null, author: null, decade: null });
    setHighlight({ bookId, location, nonce: Date.now() });
  }, []);

  const addToCart = useCallback(
    async (bookId: string, format: Format) => {
      const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shopperId, bookId, format }) });
      const d = await r.json().catch(() => ({}));
      if (d.cart) setCart(d.cart);
      return r.ok ? null : (d.error ?? "Couldn't add that to the cart.");
    },
    [shopperId],
  );

  const removeFromCart = useCallback(
    async (bookId: string, format: Format) => {
      const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shopperId, bookId, format, action: "remove" }) });
      const d = await r.json().catch(() => ({}));
      if (d.cart) setCart(d.cart);
    },
    [shopperId],
  );

  const applyUI = useCallback(
    (event: UIEvent) => {
      if (event.type === "cart_updated") setCart(event.cart);
      if (event.type === "highlight_book") showOnShelf(event.bookId, event.location);
      if (event.type === "session_locked") setLocked(true);
      if (event.type === "wanted_list_updated") setWantedVersion((v) => v + 1);
    },
    [showOnShelf],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, 1000);
      if (!text || sendingRef.current || !sessionId) return;
      sendingRef.current = true;
      setSending(true);
      setChatOpen(true);
      const agentId = newId("m");
      setMessages((m) => [
        ...m,
        { id: newId("m"), role: "user", text, cards: [], trace: [] },
        { id: agentId, role: "agent", text: "", cards: [], trace: [], pending: true },
      ]);
      const patch = (fn: (m: ChatMessage) => ChatMessage) => setMessages((all) => all.map((m) => (m.id === agentId ? fn(m) : m)));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, shopperId, message: text, persona: settings.persona, turnLimit: settings.turnLimit }),
        });
        if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line) as StreamEvent;
            if (ev.type === "text") patch((m) => ({ ...m, text: m.text + ev.delta }));
            else if (ev.type === "ui") {
              applyUI(ev.event);
              patch((m) => ({ ...m, cards: [...m.cards, ev.event] }));
            } else if (ev.type === "trace") patch((m) => ({ ...m, trace: [...m.trace, ev.event] }));
            else if (ev.type === "error") patch((m) => ({ ...m, error: ev.message }));
            else if (ev.type === "done") {
              setTurn({ turn: ev.turn, limit: ev.limit });
              if (ev.locked) setLocked(true);
            }
          }
        }
      } catch (err) {
        patch((m) => ({ ...m, error: err instanceof Error ? err.message : "Network error" }));
      } finally {
        patch((m) => ({ ...m, pending: false }));
        sendingRef.current = false;
        setSending(false);
      }
    },
    [sessionId, shopperId, settings.persona, settings.turnLimit, applyUI],
  );

  const newConversation = useCallback(() => {
    setSessionId(newId("sess"));
    setMessages([]);
    setLocked(false);
    setTurn({ turn: 0, limit: settings.turnLimit });
  }, [settings.turnLimit]);

  const value = useMemo<StoreState>(
    () => ({
      ready,
      cart,
      addToCart,
      removeFromCart,
      cartOpen,
      setCartOpen,
      highlight,
      showOnShelf,
      selectedBookId,
      setSelectedBookId,
      filters,
      setFilters,
      settings,
      setSettings,
      settingsOpen,
      setSettingsOpen,
      chatOpen,
      setChatOpen,
      messages,
      sending,
      locked,
      turn,
      send,
      newConversation,
      wantedVersion,
    }),
    [ready, cart, addToCart, removeFromCart, cartOpen, highlight, showOnShelf, selectedBookId, filters, settings, setSettings, settingsOpen, chatOpen, messages, sending, locked, turn, send, newConversation, wantedVersion],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
