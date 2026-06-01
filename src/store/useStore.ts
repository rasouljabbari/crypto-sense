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
  initialized: boolean;
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
    sortBy: "volume",
    sortOrder: "desc",
  },
  isLoading: true,
  isLive: false,
  initialized: false,
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
      set({ coins, indicators, initialized: true, isLoading: false, isLive: true, lastUpdated: new Date().toISOString() });
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

    const posVal = (pos: string) => pos === "long" ? 3 : pos === "neutral" ? 2 : 1;
    const riskVal = (c: CoinAnalysis) => {
      let s = 0;
      const match = (c.position === "long" && c.trendAnalysis.shortTerm === "bullish") ||
        (c.position === "short" && c.trendAnalysis.shortTerm === "bearish");
      if (match) s += 30;
      else if (c.trendAnalysis.shortTerm === "neutral") s += 15;
      s += (c.overallScore / 100) * 25;
      const r = c.technicalIndicators.rsi;
      if (c.position === "long") s += r < 30 ? 25 : r < 50 ? 20 : r < 70 ? 10 : 0;
      else if (c.position === "short") s += r > 70 ? 25 : r > 50 ? 20 : r > 30 ? 10 : 0;
      else s += 10;
      return s >= 85 ? 4 : s >= 65 ? 3 : s >= 40 ? 2 : 1;
    };

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
        case "position":
          cmp = posVal(a.position) - posVal(b.position);
          break;
        case "risk":
          cmp = riskVal(a) - riskVal(b);
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
    const { initialized } = get();
    if (initialized) return;
    set({ isLoading: true });
    try {
      const marketData = await fetchMarketDataList();
      const coins = analyzeAllCoins(marketData);
      const indicators = await fetchGlobalMarketData(marketData);
      set({ coins, indicators, isLive: true, initialized: true, isLoading: false, lastUpdated: new Date().toISOString() });
      get().applyFilters();
    } catch {
      set({ isLoading: false, isLive: false });
    }
  },
}));
