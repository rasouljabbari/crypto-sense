"use client";

import { fetchMarketDataList } from "@/api/binance";
import { CoinImage } from "@/components/CoinImage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/i18n/context";
import { analyzeAllCoins } from "@/lib/analysisEngine";
import type { CoinAnalysis } from "@/lib/types";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ───────────────────────────────────────
// Constants
// ───────────────────────────────────────
const MAX = 12;
const REFRESH_SECONDS = 60;
type OpportunityKey = "ready_long" | "ready_short" | "watch" | "wait" | "weakening" | "invalid";

const OPPORTUNITY_ORDER: Record<OpportunityKey, number> = {
  ready_long: 1,
  ready_short: 2,
  watch: 3,
  wait: 4,
  weakening: 5,
  invalid: 6,
};

const OP_CONFIG: Record<OpportunityKey, { icon: string; color: string; bg: string }> = {
  ready_long: { icon: "🔥", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ready_short: { icon: "🔥", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  watch: { icon: "👀", color: "text-blue-400", bg: "bg-blue-500/10" },
  wait: { icon: "⏳", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  weakening: { icon: "⚠", color: "text-orange-400", bg: "bg-orange-500/10" },
  invalid: { icon: "❌", color: "text-red-400", bg: "bg-red-500/10" },
};

const TREND_STYLE: Record<string, { color: string; bg: string }> = {
  strong_bullish: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  bullish: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  sideways: { color: "text-gray-400", bg: "bg-gray-500/10" },
  bearish: { color: "text-red-400", bg: "bg-red-500/10" },
  strong_bearish: { color: "text-red-400", bg: "bg-red-500/10" },
};

// ───────────────────────────────────────
// Helpers
// ───────────────────────────────────────

function getOpportunityKey(c: CoinAnalysis): OpportunityKey {
  if (c.recommendation === "ready") {
    if (c.position === "long") return "ready_long";
    if (c.position === "short") return "ready_short";
    return "watch";
  }
  if (c.recommendation === "wait") {
    if (c.position === "long" || c.position === "short") return "watch";
    return "wait";
  }
  if (c.status === "wait") return "weakening";
  return "invalid";
}

function formatPrice(p: number): string {
  if (p < 0.01) return `$${p.toFixed(6)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  if (p < 1_000) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUpdated(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function coinHash(c: CoinAnalysis): string {
  return `${c.marketData.currentPrice}|${c.confidence}|${c.recommendation}|${c.trendLabel}`;
}

function sortCoins(list: CoinAnalysis[]): CoinAnalysis[] {
  return [...list].sort((a, b) => {
    const pa = OPPORTUNITY_ORDER[getOpportunityKey(a)];
    const pb = OPPORTUNITY_ORDER[getOpportunityKey(b)];
    if (pa !== pb) return pa - pb;
    return b.confidence - a.confidence;
  });
}

// ───────────────────────────────────────
// Sub-components
// ───────────────────────────────────────

function CoinCard({
  coin,
  highlighted,
  onRemove,
}: {
  coin: CoinAnalysis;
  highlighted: boolean;
  onRemove: (s: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const isPos = coin.marketData.priceChangePercent24h >= 0;
  const oppKey = getOpportunityKey(coin);
  const opConf = OP_CONFIG[oppKey];
  const trend = TREND_STYLE[coin.trendLabel] ?? TREND_STYLE.sideways;

  return (
    <div
      onClick={() => router.push(`/coin/${coin.marketData.symbol}`)}
      className={`
        relative bg-gray-900/50 border border-gray-800 rounded-xl p-4
        cursor-pointer select-none
        transition-all duration-300 ease-out
        hover:border-gray-700 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02]
        ${highlighted ? "ring-2 ring-emerald-500/40" : ""}
      `}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(coin.marketData.symbol); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 bg-gray-900 hover:bg-red-900/40 z-10"
        aria-label={t("watchlist.remove")}
      >
        ✕
      </button>

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <CoinImage
            src={coin.marketData.image}
            alt={coin.marketData.symbol}
            symbol={coin.marketData.symbol}
            className="w-8 h-8 rounded-full shrink-0"
            size={32}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{coin.marketData.symbol}</div>
            <div className="text-[11px] text-gray-500 truncate leading-tight">{coin.marketData.name}</div>
          </div>
        </div>
        <div className={`text-right shrink-0 ${isPos ? "text-emerald-400" : "text-red-400"}`}>
          <div className="text-sm font-semibold font-mono leading-tight">
            {isPos ? "+" : ""}{coin.marketData.priceChangePercent24h.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="text-lg font-bold font-mono text-white mb-3">
        {formatPrice(coin.marketData.currentPrice)}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{t("watchlist.market_state")}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${trend.bg} ${trend.color}`}>
            {t(`coin_row.${coin.trendLabel}`)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{t("watchlist.strength")}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${coin.confidence}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-gray-300 min-w-[1.8rem] text-end">{coin.confidence}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{t("coin_row.opportunity")}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${opConf.bg} ${opConf.color}`}>
            <span>{opConf.icon}</span>
            <span>{t(`watchlist.opportunity.${oppKey}`)}</span>
          </span>
        </div>
      </div>

    </div>
  );
}

function AddCoinCard({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-2
        bg-gray-900/30 border-2 border-dashed border-gray-700 rounded-xl p-8
        cursor-pointer select-none
        transition-all duration-300 ease-out
        hover:border-emerald-500/50 hover:bg-gray-900/50 hover:scale-[1.02]
        min-h-[200px]
      `}
    >
      <span className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xl font-light leading-none">
        +
      </span>
      <span className="text-sm font-medium text-gray-400">{t("watchlist.add_coin")}</span>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-700" />
          <div className="space-y-1">
            <div className="h-3 w-14 bg-gray-700 rounded" />
            <div className="h-2.5 w-20 bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-3 w-12 bg-gray-700 rounded" />
      </div>
      <div className="h-6 w-24 bg-gray-700 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-700 rounded" />
        <div className="h-3 w-3/4 bg-gray-700 rounded" />
        <div className="h-3 w-5/6 bg-gray-700 rounded" />
      </div>
      <div className="mt-3 pt-2 border-t border-gray-800/50">
        <div className="h-2.5 w-16 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

function SummaryBar({ counts }: { counts: Record<string, number> }) {
  const { t } = useI18n();
  const items = [
    { key: "total_coins", label: t("watchlist.summary.total_coins"), value: counts.total, color: "text-white" },
    { key: "ready_long", label: t("watchlist.summary.ready_long"), value: counts.ready_long, icon: "🔥", color: "text-emerald-400" },
    { key: "ready_short", label: t("watchlist.summary.ready_short"), value: counts.ready_short, icon: "🔥", color: "text-emerald-400" },
    { key: "watch", label: t("watchlist.summary.watch"), value: counts.watch, icon: "👀", color: "text-blue-400" },
    { key: "wait", label: t("watchlist.summary.wait"), value: counts.wait, icon: "⏳", color: "text-yellow-400" },
    { key: "weakening", label: t("watchlist.summary.weakening"), value: counts.weakening, icon: "⚠", color: "text-orange-400" },
    { key: "invalid", label: t("watchlist.summary.invalid"), value: counts.invalid, icon: "❌", color: "text-red-400" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-2.5 text-[11px]">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1">
          {item.icon && <span className="text-[10px]">{item.icon}</span>}
          <span className="text-gray-500">{item.label}:</span>
          <span className={`font-semibold font-mono ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────
// Main Page
// ───────────────────────────────────────
export default function WatchlistPage() {
  const { t } = useI18n();

  const [symbols, setSymbols] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Frozen snapshot — only updated during refresh cycles
  const [frozenCoins, setFrozenCoins] = useState<CoinAnalysis[]>([]);
  const [displayCountdown, setDisplayCountdown] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLDivElement>(null);
  const symbolsRef = useRef(symbols);
  const prevHashRef = useRef<Record<string, string>>({});
  const countdownRef = useRef(REFRESH_SECONDS);

  // Keep ref in sync with state
  useEffect(() => { symbolsRef.current = symbols; }, [symbols]);

  // Load watchlist from localStorage
  useEffect(() => { setSymbols(getWatchlist()); }, []);

  // ── Read-only helpers (capture symbols via ref, never stale) ──
  const filterAndDetect = useCallback((allCoins: CoinAnalysis[]): CoinAnalysis[] => {
    const currentSymbols = symbolsRef.current;
    const filtered = allCoins.filter((c) => currentSymbols.includes(c.marketData.symbol));
    return sortCoins(filtered);
  }, []);

  const computeCounts = useCallback((list: CoinAnalysis[]) => {
    const c: Record<string, number> = {
      total: symbolsRef.current.length,
      ready_long: 0, ready_short: 0, watch: 0, wait: 0, weakening: 0, invalid: 0,
    };
    for (const coin of list) {
      const key = getOpportunityKey(coin);
      c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, []);

  // ── Single source of truth: 1‑second tick ──
  // First run fetches initial data, subsequent runs honour the countdown.
  useEffect(() => {
    let cancelled = false;
    let isRefreshing = false;

    const tick = async () => {
      if (cancelled) return;

      countdownRef.current = Math.max(0, countdownRef.current - 1);

      // Refresh when countdown hits 0 (skip on very first tick so initial
      // fetch can complete first — countdown starts at REFRESH_SECONDS)
      if (countdownRef.current === 0 && !isRefreshing) {
        isRefreshing = true;
        setIsUpdating(true);

        try {
          const marketData = await fetchMarketDataList();
          const freshAll = analyzeAllCoins(marketData);

          // Silently update store for cross-page consistency
          useStore.setState({
            coins: freshAll,
            lastUpdated: new Date().toISOString(),
            isLive: true,
          });

          const sorted = filterAndDetect(freshAll);

          // Highlight detection vs previous snapshot
          const newHl = new Set<string>();
          const newHash: Record<string, string> = {};
          for (const c of sorted) {
            const h = coinHash(c);
            newHash[c.marketData.symbol] = h;
            if (prevHashRef.current[c.marketData.symbol] && prevHashRef.current[c.marketData.symbol] !== h) {
              newHl.add(c.marketData.symbol);
            }
          }
          prevHashRef.current = newHash;

          if (!cancelled) {
            setFrozenCoins(sorted);
            if (newHl.size > 0) {
              setHighlighted(newHl);
              setTimeout(() => { if (!cancelled) setHighlighted(new Set()); }, 2000);
            }
          }
        } catch {
          // Keep current data on error
        }

        if (!cancelled) {
          setIsUpdating(false);
          countdownRef.current = REFRESH_SECONDS;
        }
        isRefreshing = false;
      }

      // Update countdown display every second
      if (!cancelled) {
        const rem = countdownRef.current;
        const m = Math.floor(rem / 60);
        const s = rem % 60;
        setDisplayCountdown(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      }
    };

    // First tick: fetch initial data immediately, then start countdown
    (async () => {
      try {
        const marketData = await fetchMarketDataList();
        const freshAll = analyzeAllCoins(marketData);

        useStore.setState({
          coins: freshAll,
          lastUpdated: new Date().toISOString(),
          isLive: true,
        });

        const sorted = filterAndDetect(freshAll);

        // Init hash tracking
        const initHash: Record<string, string> = {};
        for (const c of sorted) {
          initHash[c.marketData.symbol] = coinHash(c);
        }
        prevHashRef.current = initHash;

        if (!cancelled) {
          setFrozenCoins(sorted);
          setDisplayCountdown(
            `${Math.floor(REFRESH_SECONDS / 60).toString().padStart(2, "0")}:${(REFRESH_SECONDS % 60).toString().padStart(2, "0")}`
          );
        }
      } catch {
        // Initial fetch failed — countdown already running, next tick will retry
      }
    })();

    // Start the 1-second interval
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [filterAndDetect]); // stable callback, runs once

  // Re-sync when symbols change (without restarting the tick cycle)
  useEffect(() => {
    const storeCoins = useStore.getState().coins;
    if (storeCoins.length > 0) {
      const sorted = filterAndDetect(storeCoins);
      const newHash: Record<string, string> = {};
      for (const c of sorted) {
        newHash[c.marketData.symbol] = coinHash(c);
      }
      prevHashRef.current = newHash;
      setFrozenCoins(sorted);
    }
  }, [symbols, filterAndDetect]);

  // Click outside search
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Derived state from frozenCoins ──
  const pendingSymbols = useMemo(
    () => symbols.filter((s) => !frozenCoins.some((c) => c.marketData.symbol === s)),
    [symbols, frozenCoins],
  );

  const counts = useMemo(() => computeCounts(frozenCoins), [frozenCoins, computeCounts]);

  // Search results from live store (not frozen)
  const storeCoins = useStore((s) => s.coins);
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return storeCoins
      .filter(
        (c) =>
          !symbols.includes(c.marketData.symbol) &&
          (c.marketData.symbol.toLowerCase().includes(q) || c.marketData.name.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [storeCoins, symbols, query]);

  const handleAdd = useCallback(
    (symbol: string) => {
      if (symbols.length >= MAX) return;
      const updated = addToWatchlist(symbol);
      setSymbols([...updated]);
      setQuery("");
      setShowSearch(false);
    },
    [symbols.length],
  );

  const handleRemove = useCallback((symbol: string) => {
    const updated = removeFromWatchlist(symbol);
    setSymbols([...updated]);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const marketData = await fetchMarketDataList();
      const freshAll = analyzeAllCoins(marketData);
      useStore.setState({ coins: freshAll, lastUpdated: new Date().toISOString(), isLive: true });
      const sorted = filterAndDetect(freshAll);
      const newHl = new Set<string>();
      const newHash: Record<string, string> = {};
      for (const c of sorted) {
        const h = coinHash(c);
        newHash[c.marketData.symbol] = h;
        if (prevHashRef.current[c.marketData.symbol] && prevHashRef.current[c.marketData.symbol] !== h) {
          newHl.add(c.marketData.symbol);
        }
      }
      prevHashRef.current = newHash;
      setFrozenCoins(sorted);
      if (newHl.size > 0) {
        setHighlighted(newHl);
        setTimeout(() => setHighlighted(new Set()), 2000);
      }
    } catch { /* keep current data */ }
    setIsUpdating(false);
    countdownRef.current = REFRESH_SECONDS;
  }, [isUpdating, filterAndDetect]);

  const showAddCard = symbols.length < MAX;
  const skeletonCount = Math.min(pendingSymbols.length, MAX - frozenCoins.length);

  return (
    <DashboardLayout>
      {/* Header with countdown */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">{t("watchlist.title")}</h2>
          <span className="text-[10px] text-gray-500 font-mono">{symbols.length}/{MAX}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isUpdating}
            className="text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t("header.refresh")}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {isUpdating ? (
            <span className="text-[11px] text-emerald-400 font-medium animate-pulse">
              {t("header.refreshing")}
            </span>
          ) : displayCountdown && (
            <span className="text-[11px] font-mono text-gray-300">
              {displayCountdown}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {symbols.length > 0 && <SummaryBar counts={counts} />}

      {/* Search panel */}
      {showSearch && (
        <div ref={searchRef} className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("watchlist.search_placeholder")}
            autoFocus
            className="w-full sm:w-80 bg-gray-800 text-gray-100 text-sm rounded-lg px-3 py-2.5 border border-gray-700 focus:outline-none focus:border-emerald-500 placeholder-gray-500 transition-colors"
          />

          {query.trim() && (
            <div className="absolute top-full mt-1 w-full sm:w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
              {symbols.length >= MAX ? (
                <div className="p-4 text-center">
                  <p className="text-yellow-400 text-sm font-medium mb-1">{t("watchlist.watchlist_full")}</p>
                  <p className="text-gray-500 text-xs">{t("watchlist.watchlist_full_desc", { max: MAX })}</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((c) => (
                  <button
                    key={c.marketData.symbol}
                    onClick={() => handleAdd(c.marketData.symbol)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-800 transition-colors"
                  >
                    <CoinImage src={c.marketData.image} alt={c.marketData.symbol} symbol={c.marketData.symbol} size={20} />
                    <span className="font-medium text-white">{c.marketData.symbol}</span>
                    <span className="text-gray-400 text-xs">{c.marketData.name}</span>
                    <span className="ml-auto text-emerald-400 text-xs">+{t("watchlist.add_coin")}</span>
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">{t("watchlist.search_no_results")}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Card grid */}
      {symbols.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-1">{t("watchlist.empty")}</p>
          <button
            onClick={() => setShowSearch(true)}
            className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            + {t("watchlist.add_coin")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {frozenCoins.map((coin) => (
            <div key={coin.marketData.symbol} className="group">
              <CoinCard
                coin={coin}
                highlighted={highlighted.has(coin.marketData.symbol)}
                onRemove={handleRemove}
              />
            </div>
          ))}

          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={`pending-${pendingSymbols[i]}`} />
          ))}

          {showAddCard && <AddCoinCard onClick={() => setShowSearch(true)} />}
        </div>
      )}
    </DashboardLayout>
  );
}
