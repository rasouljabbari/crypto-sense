"use client";

import { create } from "zustand";
import { CoinAnalysis, FilterOptions, MarketData, MarketIndicators } from "@/lib/types";
import { fetchMarketDataList, fetchGlobalMarketData } from "@/api/binance";
import { analyzeAllCoins } from "@/lib/analysisEngine";

interface AppState {
  coins: CoinAnalysis[];
  filteredCoins: CoinAnalysis[];
  selectedCoinId: string | null;
  filters: FilterOptions;
  isLoading: boolean;
  isLive: boolean;
  lastUpdated: string | null;
  indicators: MarketIndicators;

  setCoins: (coins: CoinAnalysis[]) => void;
  updateCoin: (coinId: string, updates: Partial<CoinAnalysis>) => void;
  setSelectedCoin: (coinId: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  refreshData: () => Promise<void>;
  reanalyze: () => void;
  applyFilters: () => void;
  loadFromBinance: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  coins: [],
  filteredCoins: [],
  selectedCoinId: null,
  filters: {
    positionType: "all",
    minVolume: 0,
    minScore: 0,
    sortBy: "score",
    sortOrder: "desc",
  },
  isLoading: true,
  isLive: false,
  lastUpdated: null,
  indicators: {
    totalMarketCap: 0, totalVolume24h: 0, btcDominance: 0, ethDominance: 0, bnbDominance: 0,
    ethBtcRatio: 0, bnbBtcRatio: 0, totalExBtc: 0, totalExTop10: 0, usdtDominance: 0, othersDominance: 0,
  },

  setCoins: (coins) => {
    set({ coins });
    get().applyFilters();
  },

  updateCoin: (coinId, updates) => {
    const coins = get().coins.map((c) =>
      c.coinId === coinId ? { ...c, ...updates, lastUpdated: new Date().toISOString() } : c
    );
    set({ coins });
    get().applyFilters();
  },

  setSelectedCoin: (coinId) => set({ selectedCoinId: coinId }),

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
    get().applyFilters();
  },

  refreshData: async () => {
    set({ isLoading: true });
    try {
      const marketData = await fetchMarketDataList();
      const coins = analyzeAllCoins(marketData);
      const indicators = await fetchGlobalMarketData(marketData);
      set({ coins, indicators, isLoading: false, isLive: true, lastUpdated: new Date().toISOString() });
      get().applyFilters();
    } catch {
      set({ isLoading: false });
    }
  },

  reanalyze: () => {
    const { coins } = get();
    if (coins.length === 0) return;
    const marketDataList: MarketData[] = coins.map((c) => c.marketData);
    const reanalyzed = analyzeAllCoins(marketDataList);
    set({ coins: reanalyzed, lastUpdated: new Date().toISOString() });
    get().applyFilters();
  },

  applyFilters: () => {
    const { coins, filters } = get();

    let filtered = [...coins];

    if (filters.positionType !== "all") {
      filtered = filtered.filter((c) => c.position === filters.positionType);
    }
    if (filters.minVolume > 0) {
      filtered = filtered.filter((c) => c.marketData.volume24h >= filters.minVolume);
    }
    if (filters.minScore > 0) {
      filtered = filtered.filter((c) => c.overallScore >= filters.minScore);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case "score":
          cmp = a.overallScore - b.overallScore;
          break;
        case "volume":
          cmp = a.marketData.volume24h - b.marketData.volume24h;
          break;
        case "priceChange":
          cmp = a.marketData.priceChangePercent24h - b.marketData.priceChangePercent24h;
          break;
        case "name":
          cmp = a.marketData.name.localeCompare(b.marketData.name);
          break;
      }
      return filters.sortOrder === "desc" ? -cmp : cmp;
    });

    set({ filteredCoins: filtered });
  },

  loadFromBinance: async () => {
    set({ isLoading: true });
    try {
      const marketData = await fetchMarketDataList();
      const coins = analyzeAllCoins(marketData);
      const indicators = await fetchGlobalMarketData(marketData);
      set({ coins, indicators, isLive: true, isLoading: false, lastUpdated: new Date().toISOString() });
      get().applyFilters();
    } catch {
      set({ isLoading: false, isLive: false });
    }
  },
}));
