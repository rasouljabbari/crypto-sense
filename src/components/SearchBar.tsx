"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { CoinSearchBox } from "./CoinSearchBox";

export interface SearchCoin {
  symbol: string;
  name: string;
  binanceSymbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

const BINANCE_REST = "https://api.binance.com/api/v3";

let exchangeInfoCache: { symbol: string; baseAsset: string }[] | null = null;

async function getExchangeInfo(): Promise<{ symbol: string; baseAsset: string }[]> {
  if (exchangeInfoCache) return exchangeInfoCache;
  const res = await fetch(`${BINANCE_REST}/exchangeInfo`);
  if (!res.ok) return [];
  const json: { symbols: any[] } = await res.json();
  exchangeInfoCache = json.symbols
    .filter((s: any) => s.status === "TRADING" && s.quoteAsset === "USDT")
    .map((s: any) => ({ symbol: s.symbol, baseAsset: s.baseAsset }));
  return exchangeInfoCache;
}

async function clientSearch(query: string): Promise<SearchCoin[]> {
  try {
    const pairs = await getExchangeInfo();
    if (pairs.length === 0) return [];

    const q = query.toUpperCase().trim();
    const quoteAssets = ["USDT", "USDC", "BUSD", "FDUSD", "BNB", "BTC", "ETH", "TRY", "DAI"];
    let baseQ = q;
    for (const qa of quoteAssets) {
      if (baseQ.endsWith(qa) && baseQ.length > qa.length) {
        baseQ = baseQ.slice(0, -qa.length);
        break;
      }
    }

    const matched = pairs.filter(
      (p) => p.baseAsset.includes(baseQ) || p.baseAsset.includes(q) || p.symbol.includes(q)
    ).slice(0, 10);

    if (matched.length === 0) return [];

    const symbols = matched.map((p) => p.symbol);
    const tickerRes = await fetch(`${BINANCE_REST}/ticker/24hr?symbols=${JSON.stringify(symbols)}`);
    if (!tickerRes.ok) return [];
    const tickers: any[] = await tickerRes.json();

    return tickers.map((t: any) => {
      const pair = matched.find((p) => p.symbol === t.symbol);
      const baseAsset = pair?.baseAsset ?? t.symbol.replace(/USDT|USDC|BUSD|FDUSD|BNB|BTC|ETH|TRY|DAI$/, "");
      return {
        symbol: baseAsset,
        name: baseAsset,
        binanceSymbol: t.symbol,
        price: parseFloat(t.lastPrice),
        changePercent: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
      };
    });
  } catch {
    return [];
  }
}

export function SearchBar() {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchCoin[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      // Try server endpoint first, fall back to client-side Binance calls
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          setResults(
            json.results.map((r: any) => ({
              symbol: r.symbol, name: r.name, binanceSymbol: r.binanceSymbol,
              price: parseFloat(r.price), changePercent: parseFloat(r.changePercent),
              volume: parseFloat(r.volume),
            }))
          );
          setLoading(false);
          return;
        }
      } catch { /* fall through to client search */ }

      const clientResults = await clientSearch(query.trim());
      setResults(clientResults);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative w-full sm:w-80">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={t("search.placeholder")}
          className="w-full bg-gray-800 text-gray-100 text-xs sm:text-sm rounded-lg pl-9 pr-3 py-2 border border-gray-700 focus:outline-none focus:border-emerald-500 placeholder-gray-500 transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && query.trim() && (
        <div ref={dropdownRef} className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <div className="text-sm text-gray-500 text-center py-6">
              {t("search.no_results")}
            </div>
          ) : (
            results.map((coin) => (
              <CoinSearchBox key={coin.symbol} coin={coin} onSelect={() => { setIsOpen(false); setQuery(""); router.push(`/coin/${coin.symbol}`); }} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
