"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CoinAnalysis, FilterOptions, MarketData, MarketIndicators, SignalType, RiskLevel, TrendLabel, TradeStatus, Timeframe } from "@/lib/types";
import { fetchMarketDataList, fetchGlobalMarketData, fetchKlines, COIN_SYMBOL_MAP } from "@/api/binance";
import { analyzeAllCoins } from "@/lib/analysisEngine";
import { calculateTechnicalIndicatorsFromKlines } from "@/lib/indicators";
import { saveSnapshot } from "@/lib/snapshotStore";

interface AppState {
  coins: CoinAnalysis[];
  filteredCoins: CoinAnalysis[];
  selectedCoinId: string | null;
  filters: FilterOptions;
  isLoading: boolean;
  isRefreshing: boolean;
  isLive: boolean;
  initialized: boolean;
  lastUpdated: string | null;
  nextRefreshAt: string | null;
  refreshError: string | null;
  indicators: MarketIndicators;
  timeframe: Timeframe;
  klinesCache: Record<string, number[]>; // "BTCUSDT:1h" → closes[]

  setCoins: (coins: CoinAnalysis[]) => void;
  updateCoin: (coinId: string, updates: Partial<CoinAnalysis>) => void;
  setSelectedCoin: (coinId: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  refreshData: () => Promise<void>;
  reanalyze: () => void;
  reanalyzeSilent: () => void;
  startAutoRefresh: () => () => void;
  stopAutoRefresh: () => void;
  applyFilters: () => void;
  loadFromBinance: () => Promise<void>;
  setTimeframe: (tf: Timeframe) => Promise<void>;
  refreshWithTimeframe: (tf: Timeframe) => Promise<void>;
  getKlines: (symbol: string, tf: Timeframe) => Promise<number[]>;
}

let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
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
  isRefreshing: false,
  isLive: false,
  initialized: false,
  lastUpdated: null,
  nextRefreshAt: null,
  refreshError: null,
  indicators: {
    totalMarketCap: 0, totalVolume24h: 0, btcDominance: 0, ethDominance: 0, bnbDominance: 0,
    ethBtcRatio: 0, bnbBtcRatio: 0, totalExBtc: 0, totalExTop10: 0, usdtDominance: 0, othersDominance: 0,
  },
  timeframe: "1h",
  klinesCache: {},

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

  getKlines: async (symbol, tf) => {
    const key = `${symbol}:${tf}`;
    const cached = get().klinesCache[key];
    if (cached) return cached;
    const limit = tf === "1d" ? 365 : tf === "15m" ? 960 : 168;
    try {
      const data = await fetchKlines(symbol, tf, limit);
      const closes = data.map((d) => d.close);
      set((s) => ({ klinesCache: { ...s.klinesCache, [key]: closes } }));
      return closes;
    } catch {
      return [];
    }
  },

  setTimeframe: async (tf) => {
    const prev = get().timeframe;
    set({ timeframe: tf });
    if (get().initialized && prev !== tf) {
      await get().refreshWithTimeframe(tf);
    }
  },

  refreshWithTimeframe: async (tf) => {
    const { coins } = get();
    if (coins.length === 0) return;
    set({ isRefreshing: true, refreshError: null });
    try {
      const marketDataList: MarketData[] = coins.map((c) => c.marketData);
      // Fetch klines for each symbol in batches (up to 5 concurrent)
      const indicatorsMap: Record<string, import("@/lib/types").TechnicalIndicators> = {};
      const batch = marketDataList.slice(0, 100);
      for (let i = 0; i < batch.length; i += 5) {
        const chunk = batch.slice(i, i + 5);
        await Promise.all(chunk.map(async (md) => {
          const sym = COIN_SYMBOL_MAP[md.id];
          if (!sym) return;
          const key = `${sym}:${tf}`;
          const limit = tf === "1d" ? 365 : tf === "15m" ? 960 : 168;
          try {
            const data = await fetchKlines(sym, tf, limit);
            const closes = data.map((d) => d.close);
            set((s) => ({ klinesCache: { ...s.klinesCache, [key]: closes } }));
            if (closes.length > 20) {
              indicatorsMap[md.id] = calculateTechnicalIndicatorsFromKlines(closes, md.currentPrice);
            }
          } catch { /* skip */ }
        }));
      }
      // Re-analyze with real indicators where available
      const reanalyzed = analyzeAllCoins(marketDataList, indicatorsMap);
      set({ coins: reanalyzed, lastUpdated: new Date().toISOString(), isRefreshing: false });
      get().applyFilters();
      saveSnapshot(reanalyzed);
    } catch {
      set({ isRefreshing: false, refreshError: "Timeframe refresh failed" });
    }
  },

  refreshData: async () => {
    set({ isLoading: true });
    try {
      const marketData = await fetchMarketDataList();
      const coins = analyzeAllCoins(marketData);
      const indicators = await fetchGlobalMarketData(marketData);
      set({ coins, indicators, initialized: true, isLoading: false, isLive: true, lastUpdated: new Date().toISOString() });
      get().applyFilters();
      saveSnapshot(coins);
      // Kick off klines fetch for current timeframe
      get().refreshWithTimeframe(get().timeframe);
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
    saveSnapshot(reanalyzed);
  },

  reanalyzeSilent: () => {
    const { coins } = get();
    if (coins.length === 0) return;
    set({ isRefreshing: true, refreshError: null });

    try {
      const marketDataList: MarketData[] = coins.map((c) => c.marketData);
      const reanalyzed = analyzeAllCoins(marketDataList);

      const merged = coins.map((old) => {
        const updated = reanalyzed.find((n) => n.coinId === old.coinId);
        if (!updated) return old;
        if (
          old.overallScore === updated.overallScore &&
          old.signal === updated.signal &&
          old.confidence === updated.confidence &&
          old.tradeQuality === updated.tradeQuality &&
          old.riskLevel === updated.riskLevel &&
          old.riskReward === updated.riskReward &&
          old.trendLabel === updated.trendLabel &&
          old.status === updated.status &&
          old.marketData.currentPrice === updated.marketData.currentPrice &&
          old.marketData.priceChangePercent24h === updated.marketData.priceChangePercent24h
        ) {
          return old;
        }
        return updated;
      });

      set({ coins: merged, lastUpdated: new Date().toISOString(), isRefreshing: false });
      get().applyFilters();
      saveSnapshot(reanalyzed);
    } catch {
      set({ isRefreshing: false, refreshError: "Refresh failed" });
    }
  },

  startAutoRefresh: () => {
    get().stopAutoRefresh();
    const ms = 5 * 60 * 1000;
    refreshIntervalId = setInterval(() => {
      get().reanalyzeSilent();
      set({ nextRefreshAt: new Date(Date.now() + ms).toISOString() });
    }, ms);
    set({ nextRefreshAt: new Date(Date.now() + ms).toISOString() });
    return () => get().stopAutoRefresh();
  },

  stopAutoRefresh: () => {
    if (refreshIntervalId !== null) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    set({ nextRefreshAt: null });
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

    const signalVal = (s: SignalType) =>
      s === "strong_buy" ? 5 : s === "buy" ? 4 : s === "neutral" ? 3 : s === "sell" ? 2 : 1;
    const trendVal = (t: TrendLabel) =>
      t === "strong_bullish" ? 5 : t === "bullish" ? 4 : t === "sideways" ? 3 : t === "bearish" ? 2 : 1;
    const statusVal = (s: TradeStatus) =>
      s === "ready" ? 3 : s === "wait" ? 2 : 1;

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
          cmp = signalVal(a.signal) - signalVal(b.signal);
          break;
        case "risk":
          cmp = a.tradeQuality - b.tradeQuality;
          break;
        case "name":
          cmp = a.marketData.name.localeCompare(b.marketData.name);
          break;
        case "signal":
          cmp = signalVal(a.signal) - signalVal(b.signal);
          break;
        case "confidence":
          cmp = a.confidence - b.confidence;
          break;
        case "tradeQuality":
          cmp = a.tradeQuality - b.tradeQuality;
          break;
        case "trend":
          cmp = trendVal(a.trendLabel) - trendVal(b.trendLabel);
          break;
        case "status":
          cmp = statusVal(a.status) - statusVal(b.status);
          break;
        case "recommendation": {
          const recVal = (r: string) => r === "ready" ? 3 : r === "wait" ? 2 : 1;
          cmp = recVal(a.recommendation) - recVal(b.recommendation);
          break;
        }
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
      saveSnapshot(coins);
      // Fetch klines for current timeframe
      get().refreshWithTimeframe(get().timeframe);
    } catch {
      set({ isLoading: false, isLive: false });
    }
  },
}),
{
  name: "cryptosense-timeframe",
  partialize: (state) => ({ timeframe: state.timeframe }),
}
  )
);
