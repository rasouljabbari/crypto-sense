import { SignalType, RiskLevel, TrendLabel, TradeStatus } from "./types";
import type { CoinAnalysis } from "./types";

export interface CoinSnapshot {
  symbol: string;
  overallScore: number;
  signal: SignalType;
  trend: TrendLabel;
  risk: RiskLevel;
  tradeQuality: number;
  currentPrice: number;
  change24h: number;
}

export interface AnalysisSnapshot {
  id: string;
  timestamp: string;
  coins: CoinSnapshot[];
  totalCoins: number;
}

const STORAGE_KEY = "cryptosense-snapshots";
const MAX_SNAPSHOTS = 100;

let memoryCache: AnalysisSnapshot[] | null = null;

function loadFromDisk(): AnalysisSnapshot[] {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryCache = JSON.parse(raw) as AnalysisSnapshot[];
    }
  } catch {
    memoryCache = [];
  }
  memoryCache = memoryCache ?? [];
  return memoryCache;
}

function persist(snapshots: AnalysisSnapshot[]): void {
  memoryCache = snapshots;
  try {
    const trimmed = snapshots.slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full — silently skip */
  }
}

export function saveSnapshot(coins: CoinAnalysis[]): void {
  const snapshot: AnalysisSnapshot = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    coins: coins.map((c) => ({
      symbol: c.marketData.symbol,
      overallScore: c.overallScore,
      signal: c.signal,
      trend: c.trendLabel,
      risk: c.riskLevel,
      tradeQuality: c.tradeQuality,
      currentPrice: c.marketData.currentPrice,
      change24h: c.marketData.priceChangePercent24h,
    })),
    totalCoins: coins.length,
  };

  const existing = loadFromDisk();
  persist([snapshot, ...existing]);
}

export function getSnapshots(): AnalysisSnapshot[] {
  return loadFromDisk();
}

export function clearSnapshots(): void {
  memoryCache = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
