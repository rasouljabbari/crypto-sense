"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterOptions, Timeframe } from "@/lib/types";

interface AppState {
  filters: FilterOptions;
  timeframe: Timeframe;
  setFilters: (filters: Partial<FilterOptions>) => void;
  setTimeframe: (tf: Timeframe) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      filters: {
        positionType: "all",
        minVolume: 0,
        minScore: 0,
        sortBy: "recommendation",
        sortOrder: "desc",
      },
      timeframe: "1h",

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      setTimeframe: (tf) => {
        set({ timeframe: tf });
      },
    }),
    {
      name: "cryptosense-timeframe",
      partialize: (state) => ({ timeframe: state.timeframe }),
    }
  )
);
