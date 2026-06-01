"use client";

import { useEffect, useRef } from "react";
import { useStore } from "./useStore";
import { createBinanceWebSocket, COIN_SYMBOL_MAP, STATIC_COIN_DATA } from "@/api/binance";
import type { MarketData } from "@/lib/types";

interface BinanceTickerData {
  s: string;
  c: string;
  v: string;
  h: string;
  l: string;
  P?: string;
}

function tickerToCoinUpdate(ticker: BinanceTickerData) {
  const symbol = ticker.s;
  const coinId = Object.entries(COIN_SYMBOL_MAP).find(([, sym]) => sym === symbol)?.[0];
  if (!coinId) return null;

  const staticData = STATIC_COIN_DATA[coinId];
  const price = parseFloat(ticker.c);
  const volume = parseFloat(ticker.v);
  const high = parseFloat(ticker.h);
  const low = parseFloat(ticker.l);

  const marketData: MarketData = {
    ...staticData,
    currentPrice: price,
    volume24h: volume * price,
    high24h: high,
    low24h: low,
    priceChangePercent24h: ticker.P ? parseFloat(ticker.P) : 0,
    marketCap: price * staticData.circulatingSupply,
    priceChange24h: 0,
  };

  return { coinId, marketData };
}

let wsSingleton: WebSocket | null = null;
let analysisInterval: NodeJS.Timeout | null = null;
let connectCount = 0;

export function useBinanceWebSocket() {
  const { updateCoin, reanalyze, isLive } = useStore();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!isLive || connectCount > 0) return;
    connectCount++;

    function connect() {
      if (wsSingleton?.readyState === WebSocket.OPEN) return;
      try {
        const ws = createBinanceWebSocket((data: BinanceTickerData) => {
          if (!mountedRef.current) return;
          const update = tickerToCoinUpdate(data);
          if (update) {
            updateCoin(update.coinId, {
              marketData: update.marketData,
              lastUpdated: new Date().toISOString(),
            });
          }
        });
        wsSingleton = ws;
        ws.onclose = () => { if (mountedRef.current) setTimeout(connect, 5000); };
        ws.onerror = () => { if (mountedRef.current) setTimeout(connect, 5000); };
      } catch {
        if (mountedRef.current) setTimeout(connect, 5000);
      }
    }

    connect();

    if (!analysisInterval) {
      analysisInterval = setInterval(() => { reanalyze(); }, 30000);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [updateCoin, reanalyze, isLive]);
}
