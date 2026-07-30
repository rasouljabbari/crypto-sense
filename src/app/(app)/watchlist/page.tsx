"use client";

import { AnalysisStatus } from "@/components/AnalysisStatus";
import { CoinImage } from "@/components/CoinImage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/i18n/context";
import type { AnalysisSnapshot } from "@/store/useAnalysisSnapshot";
import { useSnapshotStore } from "@/store/useAnalysisSnapshot";
import { useTimeframe } from "@/lib/timeframe";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/lib/watchlist";
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

function getOpportunityKey(c: AnalysisSnapshot): OpportunityKey {
  if (c.opportunity.recommendation === "ready") {
    if (c.tradeSetup.direction === "long") return "ready_long";
    if (c.tradeSetup.direction === "short") return "ready_short";
    // Fallback: infer direction from signal when tradeSetup.direction is missing
    const sig = c.opportunity.signal;
    if (sig === "sell" || sig === "strong_sell") return "ready_short";
    if (sig === "buy" || sig === "strong_buy") return "ready_long";
    return "watch";
  }
  if (c.opportunity.recommendation === "wait") {
    if (c.tradeSetup.direction) return "watch";
    return "wait";
  }
  return "invalid";
}

function formatPrice(p: number): string {
  if (p < 0.01) return `$${p.toFixed(6)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  if (p < 1_000) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUpdated(ts: string | number): string {
  const ms = typeof ts === "number" ? ts : new Date(ts).getTime();
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function ns(s: string): string { return s.toLowerCase().replace(/\s+/g, "_"); }

function sortCoins(list: AnalysisSnapshot[]): AnalysisSnapshot[] {
  return [...list].sort((a, b) => {
    const pa = OPPORTUNITY_ORDER[getOpportunityKey(a)];
    const pb = OPPORTUNITY_ORDER[getOpportunityKey(b)];
    if (pa !== pb) return pa - pb;
    return b.opportunity.confidence - a.opportunity.confidence;
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
  coin: AnalysisSnapshot;
  highlighted: boolean;
  onRemove: (s: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const changePct = parseFloat(coin.marketState.changePercent24h.replace(/[^0-9.\-]/g, "")) || 0;
  const isPos = changePct >= 0;
  const oppKey = getOpportunityKey(coin);
  const opConf = OP_CONFIG[oppKey];
  const trendKey = ns(coin.marketState.trend);
  const trend = TREND_STYLE[trendKey] ?? TREND_STYLE.sideways;

  return (
    <div
      onClick={() => router.push(`/analysis?coin=${encodeURIComponent(coin.coin)}`)}
      className={`
        relative bg-gray-900/50 border border-gray-800 rounded-xl p-4
        cursor-pointer select-none
        transition-all duration-300 ease-out
        hover:border-gray-700 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02]
        ${highlighted ? "ring-2 ring-emerald-500/40" : ""}
      `}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(coin.symbol); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 bg-gray-900 hover:bg-red-900/40 z-10"
        aria-label={t("watchlist.remove")}
      >
        ✕
      </button>

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <CoinImage
            src={coin.image}
            alt={coin.symbol}
            symbol={coin.symbol}
            className="w-8 h-8 rounded-full shrink-0"
            size={32}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{coin.symbol}</div>
            <div className="text-[11px] text-gray-500 truncate leading-tight">{coin.name}</div>
          </div>
        </div>
        <div className={`text-right shrink-0 ${isPos ? "text-emerald-400" : "text-red-400"}`}>
          <div className="text-sm font-semibold font-mono leading-tight">
            {isPos ? "+" : ""}{changePct.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="text-lg font-bold font-mono text-white mb-3">
        {formatPrice(coin.price)}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{t("watchlist.market_state")}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${trend.bg} ${trend.color}`}>
            {t(`coin_row.${trendKey}`)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{t("watchlist.strength")}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${coin.opportunity.confidence}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-gray-300 min-w-[1.8rem] text-end">{coin.opportunity.confidence}</span>
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

      {/* Analysis Summary footer */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-600 leading-tight">
        <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${opConf.bg} ${opConf.color}`}>
          {t(`coin_row.rec_${coin.opportunity.recommendation}`)}
        </span>
        <span className="font-mono">{coin.opportunity.confidence}%</span>
        {(coin.opportunity.reasons ?? []).length > 0 && (
          <span className="truncate max-w-[120px]" title={(coin.opportunity.reasons ?? []).join(", ")}>
            {(coin.opportunity.reasons ?? [])[0]}
          </span>
        )}
        <span className="ml-auto">{coin.timeframe}</span>
        <span>·</span>
        <span>{formatUpdated(coin.generatedAt)}</span>
        <span>·</span>
        <span>v{coin.version}</span>
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
  const { timeframe } = useTimeframe();
  const collection = useSnapshotStore((s) => s.collections[timeframe]);
  const triggerRefresh = useSnapshotStore((s) => s.triggerRefresh);
  const isLoading = useSnapshotStore((s) => s.isLoading);

  const [symbols, setSymbols] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load watchlist from localStorage
  useEffect(() => { setSymbols(getWatchlist()); }, []);

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

  // ── Derived from snapshots ──
  const watchlistCoins = useMemo(() => {
    const all = Object.values(collection);
    const filtered = all.filter((c) => symbols.includes(c.symbol));
    return sortCoins(filtered);
  }, [collection, symbols]);

  const pendingSymbols = useMemo(
    () => symbols.filter((s) => !watchlistCoins.some((c) => c.symbol === s)),
    [symbols, watchlistCoins],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      total: symbols.length,
      ready_long: 0, ready_short: 0, watch: 0, wait: 0, weakening: 0, invalid: 0,
    };
    for (const coin of watchlistCoins) {
      const key = getOpportunityKey(coin);
      c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, [watchlistCoins, symbols.length]);

  // Search from collection for current timeframe
  const allSnapshots = useMemo(() => Object.values(collection), [collection]);
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allSnapshots
      .filter(
        (c) =>
          !symbols.includes(c.symbol) &&
          (c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [allSnapshots, symbols, query]);

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

  const showAddCard = symbols.length < MAX;
  const skeletonCount = Math.min(pendingSymbols.length, MAX - watchlistCoins.length);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">{t("watchlist.title")}</h2>
          <span className="text-[10px] text-gray-500 font-mono">{symbols.length}/{MAX}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerRefresh}
            disabled={isLoading}
            className="text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t("header.refresh")}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <AnalysisStatus />

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
                    key={c.symbol}
                    onClick={() => handleAdd(c.symbol)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-800 transition-colors"
                  >
                    <CoinImage src={c.image} alt={c.symbol} symbol={c.symbol} size={20} />
                    <span className="font-medium text-white">{c.symbol}</span>
                    <span className="text-gray-400 text-xs">{c.name}</span>
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
          {watchlistCoins.map((coin) => (
            <div key={coin.symbol} className="group">
              <CoinCard
                coin={coin}
                highlighted={false}
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
