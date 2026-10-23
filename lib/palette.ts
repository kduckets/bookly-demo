/**
 * Deterministic book colors. Every book gets a stable flat color and size from a hash of its ID,
 * so the shelves look varied but never change between visits. No real cover art.
 */

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const COLORS = [
  "#1f2937", "#374151", "#44403c", "#3f4f3a", "#4d5d43", "#2f5d62",
  "#33507a", "#3d4a6b", "#5b4a6e", "#7a3b3b", "#9a5b3c", "#b0894f",
  "#c9b896", "#d6d3d1", "#e7e5e4", "#a8b5a2", "#9fb4c7", "#d4b5a5",
];

export interface Binding {
  color: string;
  ink: string;
  isLight: boolean;
  width: number;
  height: number;
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const cache = new Map<string, Binding>();

export function bindingFor(id: string, title: string): Binding {
  const hit = cache.get(id);
  if (hit) return hit;
  const h = hashString(id);
  const color = COLORS[h % COLORS.length];
  const isLight = luminance(color) > 0.6;
  const b: Binding = {
    color,
    isLight,
    ink: isLight ? "#1c1917" : "#ffffff",
    width: 30 + ((h >>> 8) % 12) + Math.min(6, Math.floor(title.length / 6)),
    height: 176 + ((h >>> 16) % 40),
  };
  cache.set(id, b);
  return b;
}
