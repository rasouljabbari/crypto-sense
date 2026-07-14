"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useI18n } from "@/i18n/context";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface CoinSearchCoin {
  symbol: string;
  name: string;
  image?: string;
}

interface ApiSearchResult {
  symbol: string;
  name: string;
  binanceSymbol: string;
  price: string;
  changePercent: string;
  volume: string;
}

export interface CoinSearchProps {
  /** Full coin list used for autocomplete filtering (client-side). */
  coins: CoinSearchCoin[];
  /** Coins shown in the "Popular" pill row. Defaults to first 5 of `coins`. */
  popularCoins?: CoinSearchCoin[];
  /** Initial value for the search input. Updates when value changes. */
  defaultQuery?: string;
  /** Callback when user selects a coin from dropdown or clicks a pill. */
  onSelect: (coin: CoinSearchCoin) => void;
  /** Callback when user presses Enter or clicks the search button with free text. */
  onSearch: (query: string) => void;
  /** Callback to clear recent searches from the parent side. */
  onClearRecent?: () => void;
  /** Show a spinner inside the input. */
  loading?: boolean;
  /** When set, shows an inline error banner above the input. */
  error?: string | null;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Label above the search box. */
  searchLabel?: string;
  /** Label for the search button. */
  searchButtonLabel?: string;
  /** Label above the popular section. */
  popularLabel?: string;
  /** Label above the recent section. */
  recentLabel?: string;
  /** Message when autocomplete yields no matches. */
  noResultsLabel?: string;
  /** Additional class names on the outer wrapper. */
  className?: string;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const RECENT_STORAGE_KEY = "cryptosense-recent-searches";
const MAX_RECENT = 8;
const MAX_AUTOCOMPLETE = 8;

/* ── Component ─────────────────────────────────────────────────────────── */

export function CoinSearch({
  coins,
  popularCoins,
  defaultQuery = "",
  onSelect,
  onSearch,
  onClearRecent,
  loading = false,
  error = null,
  placeholder,
  searchLabel,
  searchButtonLabel,
  popularLabel,
  recentLabel,
  noResultsLabel,
  className = "",
}: CoinSearchProps) {
  const { t } = useI18n();

  /* ── Derived labels (i18n defaults) ──────────────────────────────────── */
  const _placeholder = placeholder ?? t("coin_search.placeholder");
  const _searchLabel = searchLabel ?? t("coin_search.label");
  const _searchBtn = searchButtonLabel ?? t("coin_search.button");
  const _popularLabel = popularLabel ?? t("coin_search.popular");
  const _recentLabel = recentLabel ?? t("coin_search.recent");
  const _noResults = noResultsLabel ?? t("coin_search.no_results");

  /* ── State ───────────────────────────────────────────────────────────── */
  const [query, setQuery] = useState(defaultQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [apiResults, setApiResults] = useState<CoinSearchCoin[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const apiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* ── Sync when parent changes defaultQuery (e.g. URL param) ──────────── */
  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  /* ── API search (debounced) ──────────────────────────────────────────── */
  useEffect(() => {
    if (apiTimer.current) clearTimeout(apiTimer.current);
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 1) {
      setApiResults([]);
      return;
    }
    const localMatch = coins.some(
      (c) =>
        c.symbol.toUpperCase().includes(trimmed.toUpperCase()) ||
        c.name.toUpperCase().includes(trimmed.toUpperCase()),
    );
    if (localMatch) {
      setApiResults([]);
      return;
    }
    apiTimer.current = setTimeout(async () => {
      setApiLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.results) {
          setApiResults(
            json.results.map((r: ApiSearchResult) => ({
              symbol: r.symbol,
              name: r.name,
            })),
          );
        }
      } catch {
      } finally {
        setApiLoading(false);
      }
    }, 300);
    return () => {
      if (apiTimer.current) clearTimeout(apiTimer.current);
    };
  }, [query, coins]);

  /* ── Load recent searches from localStorage on mount ─────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Persist recent searches ─────────────────────────────────────────── */
  const persistRecent = useCallback((items: string[]) => {
    setRecentSearches(items);
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, []);

  const addRecent = useCallback(
    (term: string) => {
      const trimmed = term.trim().toUpperCase();
      if (!trimmed) return;
      persistRecent([
        trimmed,
        ...recentSearches.filter((r) => r !== trimmed),
      ].slice(0, MAX_RECENT));
    },
    [recentSearches, persistRecent],
  );

  const removeRecent = useCallback(
    (term: string) => {
      persistRecent(recentSearches.filter((r) => r !== term));
    },
    [recentSearches, persistRecent],
  );

  const clearAllRecent = useCallback(() => {
    persistRecent([]);
    onClearRecent?.();
  }, [persistRecent, onClearRecent]);

  /* ── Autocomplete (local + API) ─────────────────────────────────────── */
  const localMatches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toUpperCase();
    return coins
      .filter(
        (c) =>
          c.symbol.toUpperCase().includes(q) ||
          c.name.toUpperCase().includes(q),
      )
      .slice(0, MAX_AUTOCOMPLETE);
  }, [coins, query]);

  const matches = useMemo(() => {
    if (localMatches.length > 0) return localMatches;
    return apiResults.slice(0, MAX_AUTOCOMPLETE);
  }, [localMatches, apiResults]);

  /* ── Popular coins fallback ──────────────────────────────────────────── */
  const _popular = useMemo(
    () => popularCoins ?? coins.slice(0, 5),
    [popularCoins, coins],
  );

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const selectCoin = useCallback(
    (coin: CoinSearchCoin) => {
      addRecent(coin.symbol);
      setIsOpen(false);
      onSelect(coin);
    },
    [addRecent, onSelect],
  );

  const submitFreeText = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    addRecent(trimmed);
    setIsOpen(false);
    onSearch(trimmed);
  }, [query, addRecent, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (matches.length > 0 && query.trim()) {
          selectCoin(matches[0]);
        } else {
          submitFreeText();
        }
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [matches, query, selectCoin, submitFreeText],
  );

  /* ── Click-outside ───────────────────────────────────────────────────── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Dropdown visibility ─────────────────────────────────────────────── */
  const showDropdown = isOpen && (query.trim().length > 0 || recentSearches.length > 0);
  const showAutocomplete = query.trim().length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* ── Label ────────────────────────────────────────────────────────── */}
      <label className="block text-sm font-medium text-gray-400 mb-3">
        {_searchLabel}
      </label>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-3 flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 bg-red-900/10 border border-red-500/20 rounded-xl">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ── Input row ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          {/* magnifying glass icon */}
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={_placeholder}
            autoComplete="off"
            className="w-full pl-12 pr-4 py-3.5 text-sm bg-gray-800 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />

          {/* loading spinner */}
          {loading && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </span>
          )}
        </div>

        <button
          onClick={submitFreeText}
          disabled={!query.trim()}
          className="px-6 py-3.5 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {_searchBtn}
        </button>
      </div>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {/* Autocomplete results */}
          {showAutocomplete && (
            <div className="max-h-72 overflow-y-auto">
              {matches.length > 0 ? (
                matches.map((coin) => (
                  <button
                    key={coin.symbol}
                    onClick={() => selectCoin(coin)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800/60 transition-colors border-b border-gray-800/50 last:border-0"
                  >
                    {coin.image ? (
                      <img
                        src={coin.image}
                        alt={coin.name}
                        className="w-6 h-6 rounded-full shrink-0"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                        {coin.symbol.slice(0, 2)}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-100 shrink-0">
                      {coin.symbol}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {coin.name}
                    </span>
                  </button>
                ))
              ) : apiLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                  Searching...
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  {_noResults}
                </div>
              )}
            </div>
          )}

          {/* Recent searches (visible when input is empty) */}
          {!showAutocomplete && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {_recentLabel}
                </span>
                <button
                  onClick={clearAllRecent}
                  className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {t("coin_search.clear_all")}
                </button>
              </div>
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {recentSearches.map((term) => (
                  <span
                    key={term}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-300"
                  >
                    <button
                      onClick={() => {
                        setQuery(term);
                        setIsOpen(true);
                        inputRef.current?.focus();
                      }}
                      className="hover:text-emerald-400 transition-colors"
                    >
                      {term}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(term);
                      }}
                      className="text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Popular coins ────────────────────────────────────────────────── */}
      {_popular.length > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">{_popularLabel}:</span>
          {_popular.map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => selectCoin(coin)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
              {coin.symbol}
              <span className="text-gray-500 hidden sm:inline">{coin.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
