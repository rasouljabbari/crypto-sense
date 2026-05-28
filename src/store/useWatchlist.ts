"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchlistItem {
  symbol: string;
  name: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  add: (item: WatchlistItem) => void;
  remove: (symbol: string) => void;
  has: (symbol: string) => boolean;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          if (s.items.some((i) => i.symbol === item.symbol)) return s;
          return { items: [...s.items, item] };
        }),
      remove: (symbol) =>
        set((s) => ({ items: s.items.filter((i) => i.symbol !== symbol) })),
      has: (symbol) => get().items.some((i) => i.symbol === symbol),
    }),
    { name: "cryptosense-watchlist" }
  )
);
