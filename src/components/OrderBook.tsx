"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useI18n } from "@/i18n/context";

interface OrderEntry {
  price: number;
  qty: number;
  total: number;
}

interface OrderBookData {
  bids: OrderEntry[];
  asks: OrderEntry[];
}

const BINANCE_REST = "https://api.binance.com/api/v3";

async function fetchOrderBook(symbol: string): Promise<OrderBookData | null> {
  try {
    const res = await fetch(`${BINANCE_REST}/depth?symbol=${symbol}&limit=10`);
    if (!res.ok) return null;
    const json = await res.json();
    const bids: OrderEntry[] = (json.bids ?? []).map((b: string[]) => ({
      price: parseFloat(b[0]),
      qty: parseFloat(b[1]),
      total: parseFloat(b[0]) * parseFloat(b[1]),
    }));
    const asks: OrderEntry[] = (json.asks ?? []).map((a: string[]) => ({
      price: parseFloat(a[0]),
      qty: parseFloat(a[1]),
      total: parseFloat(a[0]) * parseFloat(a[1]),
    }));
    return { bids, asks };
  } catch {
    return null;
  }
}

const fmtPrice = (p: number) => {
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
};

const fmtQty = (q: number) => {
  if (q >= 1000) return q.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (q >= 1) return q.toFixed(2);
  return q.toFixed(4);
};

const fmtTotal = (t: number) => {
  if (t >= 1e6) return (t / 1e6).toFixed(1) + "M";
  if (t >= 1e3) return (t / 1e3).toFixed(1) + "K";
  return t.toFixed(1);
};

export function OrderBook({ symbol }: { symbol: string }) {
  const { t, dir } = useI18n();
  const [data, setData] = useState<OrderBookData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const d = await fetchOrderBook(symbol);
    if (d) setData(d);
  }, [symbol]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 1000);

    const onVisibility = () => {
      if (document.hidden && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else if (!document.hidden && !intervalRef.current) {
        load();
        intervalRef.current = setInterval(load, 1000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const bids = data?.bids ?? [];
  const asks = data?.asks ?? [];
  const maxBidTotal = Math.max(...bids.map((b) => b.total), 1);
  const maxAskTotal = Math.max(...asks.map((a) => a.total), 1);

  const totalBidVolume = bids.reduce((s, b) => s + b.total, 0);
  const totalAskVolume = asks.reduce((s, a) => s + a.total, 0);
  const combinedVolume = totalBidVolume + totalAskVolume;
  const buyPressure = combinedVolume > 0 ? (totalBidVolume / combinedVolume) * 100 : 50;
  const sellPressure = 100 - buyPressure;

  const liquidityKey = combinedVolume > 10_000_000 ? "high" : combinedVolume > 1_000_000 ? "medium" : "low";
  const liquidityLabel = t(`order_book.liquidity_${liquidityKey}`);
  const liquidityColor = liquidityKey === "high" ? "text-emerald-400" : liquidityKey === "medium" ? "text-yellow-400" : "text-gray-400";

  const largestBid = bids.reduce((m, b) => (b.total > m.total ? b : m), bids[0] ?? null);
  const largestAsk = asks.reduce((m, a) => (a.total > m.total ? a : m), asks[0] ?? null);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">{t("order_book.title")}</h3>

      {/* Summary */}
      {(data && (bids.length > 0 || asks.length > 0)) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {/* Buy Pressure */}
          <div className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              {t("order_book.buy_pressure")}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-400">
              {buyPressure.toFixed(0)}%
            </div>
            <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${buyPressure}%` }} />
            </div>
          </div>

          {/* Sell Pressure */}
          <div className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              {t("order_book.sell_pressure")}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-red-400">
              {sellPressure.toFixed(0)}%
            </div>
            <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${sellPressure}%` }} />
            </div>
          </div>

          {/* Liquidity */}
          <div className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              {t("order_book.liquidity")}
            </div>
            <div className={`text-lg font-bold ${liquidityColor}`}>
              {liquidityLabel}
            </div>
            <div className="mt-1.5 text-[10px] text-gray-600 font-mono">
              {fmtTotal(combinedVolume)}
            </div>
          </div>

          {/* Largest Bid Wall */}
          <div className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              {t("order_book.largest_bid_wall")}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-400">
              {largestBid ? fmtPrice(largestBid.price) : "—"}
            </div>
            {largestBid && (
              <div className="mt-1.5 text-[10px] text-gray-600">
                {fmtQty(largestBid.qty)} · {fmtTotal(largestBid.total)}
              </div>
            )}
          </div>

          {/* Largest Ask Wall */}
          <div className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              {t("order_book.largest_ask_wall")}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-red-400">
              {largestAsk ? fmtPrice(largestAsk.price) : "—"}
            </div>
            {largestAsk && (
              <div className="mt-1.5 text-[10px] text-gray-600">
                {fmtQty(largestAsk.qty)} · {fmtTotal(largestAsk.total)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`flex flex-col sm:flex-row gap-4 ${dir === "rtl" ? "sm:flex-row-reverse" : ""}`}>
        {/* Bids (left) */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-emerald-400 font-semibold mb-1 px-1">{t("order_book.bids")}</div>
          <div className={`grid grid-cols-3 gap-1 text-[10px] text-gray-500 font-medium px-1 pb-1 border-b border-gray-800/50`}>
            <span>{t("order_book.price")}</span>
            <span className="text-right">{t("order_book.amount")}</span>
            <span className="text-right">{t("order_book.total")}</span>
          </div>
          <div className="space-y-[1px] mt-1">
            {bids.map((b, i) => (
              <div key={i} className="grid grid-cols-3 gap-1 text-[11px] font-mono px-1 py-[2px] relative">
                <div className="absolute right-0 top-0 h-full bg-emerald-900/20 rounded" style={{ width: `${(b.total / maxBidTotal) * 100}%` }} />
                <span className="relative z-10 text-emerald-400">{fmtPrice(b.price)}</span>
                <span className="relative z-10 text-right text-gray-300">{fmtQty(b.qty)}</span>
                <span className="relative z-10 text-right text-gray-400">{fmtTotal(b.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Asks (right) */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-red-400 font-semibold mb-1 px-1">{t("order_book.asks")}</div>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-500 font-medium px-1 pb-1 border-b border-gray-800/50">
            <span>{t("order_book.price")}</span>
            <span className="text-right">{t("order_book.amount")}</span>
            <span className="text-right">{t("order_book.total")}</span>
          </div>
          <div className="space-y-[1px] mt-1">
            {[...asks].reverse().map((a, i) => (
              <div key={i} className="grid grid-cols-3 gap-1 text-[11px] font-mono px-1 py-[2px] relative">
                <div className="absolute right-0 top-0 h-full bg-red-900/20 rounded" style={{ width: `${(a.total / maxAskTotal) * 100}%` }} />
                <span className="relative z-10 text-red-400">{fmtPrice(a.price)}</span>
                <span className="relative z-10 text-right text-gray-300">{fmtQty(a.qty)}</span>
                <span className="relative z-10 text-right text-gray-400">{fmtTotal(a.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
