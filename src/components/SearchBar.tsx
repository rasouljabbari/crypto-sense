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
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        setResults(
          (json.results ?? []).map((r: any) => ({
            symbol: r.symbol,
            name: r.name,
            binanceSymbol: r.binanceSymbol,
            price: parseFloat(r.price),
            changePercent: parseFloat(r.changePercent),
            volume: parseFloat(r.volume),
          }))
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
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
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t("search.placeholder")}
          className="w-full bg-gray-800 text-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-80 overflow-y-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
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
