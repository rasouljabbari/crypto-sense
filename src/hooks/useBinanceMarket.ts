"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import binanceService, { type TickerData } from "@/services/binance-market";
import { FEATURED_SYMBOLS } from "@/config/featured-coins";

export interface CoinTicker {
  symbol: string;
  base: string;
  price: number;
  priceFormatted: string;
  change24h: number;
  changePercent24h: number;
  changeFormatted: string;
  high24h: number;
  low24h: number;
  volume24h: number;
  volumeFormatted: string;
  quoteVolume24h: number;
  dir: "up" | "down";
}

function formatPrice(p: number): string {
  if (p >= 1) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function useBinanceMarket() {
  const [tickers, setTickers] = useState<Map<string, CoinTicker>>(new Map());
  const [connected, setConnected] = useState(false);
  const [sparklines, setSparklines] = useState<Map<string, number[]>>(new Map());
  const sparklinesLoaded = useRef(false);

  useEffect(() => {
    const unsub = binanceService.subscribe((data) => {
      const mapped = new Map<string, CoinTicker>();
      for (const [sym, t] of data) {
        const dir: "up" | "down" = t.changePercent24h >= 0 ? "up" : "down";
        mapped.set(sym, {
          symbol: t.symbol,
          base: t.base,
          price: t.price,
          priceFormatted: formatPrice(t.price),
          change24h: t.change24h,
          changePercent24h: t.changePercent24h,
          changeFormatted: `${t.changePercent24h >= 0 ? "+" : ""}${t.changePercent24h.toFixed(2)}%`,
          high24h: t.high24h,
          low24h: t.low24h,
          volume24h: t.volume24h,
          volumeFormatted: formatVolume(t.quoteVolume24h),
          quoteVolume24h: t.quoteVolume24h,
          dir,
        });
      }
      setTickers(mapped);
      setConnected(binanceService.getConnected());
    });

    return unsub;
  }, []);

  const loadSparklines = useCallback(async () => {
    if (sparklinesLoaded.current) return;
    sparklinesLoaded.current = true;
    const results = new Map<string, number[]>();
    for (const sym of FEATURED_SYMBOLS) {
      const prices = await binanceService.fetchSparkline(sym);
      if (prices.length > 0) results.set(sym, prices);
    }
    if (results.size > 0) setSparklines(results);
  }, []);

  useEffect(() => {
    loadSparklines();
  }, [loadSparklines]);

  const getTicker = useCallback(
    (sym: string): CoinTicker | undefined => tickers.get(sym),
    [tickers]
  );

  const getSparkline = useCallback(
    (sym: string): number[] | undefined => sparklines.get(sym),
    [sparklines]
  );

  return { tickers, connected, getTicker, getSparkline, sparklines };
}
