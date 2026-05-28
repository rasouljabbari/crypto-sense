"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import type { SearchCoin } from "./SearchBar";
import { estimatePosition } from "@/lib/indicators";

const positionStyle: Record<string, { text: string; bg: string; label: string }> = {
  long: { text: "text-emerald-400", bg: "bg-emerald-900/40", label: "LONG" },
  short: { text: "text-red-400", bg: "bg-red-900/40", label: "SHORT" },
  neutral: { text: "text-yellow-400", bg: "bg-yellow-900/40", label: "NEUTRAL" },
};

interface Props {
  coin: SearchCoin;
  onSelect: () => void;
}

async function fetchWatchlist(): Promise<string[]> {
  try {
    const res = await fetch("/api/watchlist");
    if (!res.ok) return [];
    const json = await res.json();
    return (json.items ?? []).map((i: any) => i.symbol);
  } catch {
    return [];
  }
}

async function addToWatchlist(symbol: string, name: string) {
  await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, name }),
  });
}

async function removeFromWatchlist(symbol: string) {
  await fetch(`/api/watchlist?symbol=${symbol}`, { method: "DELETE" });
}

export function CoinSearchBox({ coin, onSelect }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isPositive = coin.changePercent >= 0;
  const pos = estimatePosition(coin.changePercent);
  const ps = positionStyle[pos.position];
  const [watched, setWatched] = useState(false);
  const [loadingWatch, setLoadingWatch] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchWatchlist().then((list) => setWatched(list.includes(coin.symbol)));
  }, [status, coin.symbol]);

  const toggleWatch = useCallback(async () => {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    setLoadingWatch(true);
    try {
      if (watched) {
        await removeFromWatchlist(coin.symbol);
        setWatched(false);
      } else {
        await addToWatchlist(coin.symbol, coin.name);
        setWatched(true);
      }
      window.dispatchEvent(new CustomEvent("watchlist-changed"));
    } finally {
      setLoadingWatch(false);
    }
  }, [status, watched, coin.symbol, coin.name, router, pathname]);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-800/60 transition-colors border-b border-gray-800/50 last:border-0">
      <div
        onClick={onSelect}
        className="flex-1 flex items-center gap-2.5 cursor-pointer min-w-0"
      >
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0">
          {coin.symbol.slice(0, 2)}
        </div>
        <span className="font-medium text-white text-sm shrink-0">{coin.symbol}</span>
        <span className={`font-mono text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          <span className="ml-1.5">
            {isPositive ? "+" : ""}{coin.changePercent.toFixed(2)}%
          </span>
        </span>
      </div>

      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${ps.text} ${ps.bg}`}>
        {ps.label}
      </span>

      <button
        onClick={toggleWatch}
        disabled={loadingWatch}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full border transition-colors ${
          watched
            ? "bg-red-900/20 text-red-400 border-red-500/30 hover:bg-red-900/40"
            : "bg-gray-800 text-gray-500 border-gray-700 hover:text-emerald-400 hover:border-emerald-500/50"
        } disabled:opacity-50`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {watched
            ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          }
        </svg>
      </button>
    </div>
  );
}
