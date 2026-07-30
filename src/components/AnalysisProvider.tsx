"use client";

import { useEffect, useRef } from "react";
import { useSnapshotStore, buildSnapshotFromLegacy } from "@/store/useAnalysisSnapshot";
import { useClosedCandleKey, CANDLE_SETTLE_MS } from "@/lib/candleTime";
import { TIMEFRAME_OPTIONS, type TimeframeOption } from "@/lib/timeframe";
import { fetchMarketDataList, fetchGlobalMarketData, fetchKlines, COIN_SYMBOL_MAP } from "@/api/binance";
import { analyzeAllCoins } from "@/lib/analysisEngine";
import { computeTechnicalIndicators } from "@/lib/indicators";

/* ─── Market Data Cache ─────────────────────────────────────────────── */
/* Avoids redundant fetches when multiple timeframe loops trigger at once. */

let _marketDataCache: { data: ReturnType<typeof fetchMarketDataList> extends Promise<infer T> ? T : never; ts: number } | null = null;
const CACHE_TTL_MS = 15_000;

async function fetchMarketDataCached() {
  if (_marketDataCache && Date.now() - _marketDataCache.ts < CACHE_TTL_MS) {
    return _marketDataCache.data;
  }
  const data = await fetchMarketDataList();
  _marketDataCache = { data, ts: Date.now() };
  return data;
}

/* ─── Post-close Safety Delay ───────────────────────────────────────── */
/* After useClosedCandleKey fires (already past CANDLE_SETTLE_MS), we     */
/* wait an additional buffer so the exchange API definitively reflects   */
/* the closed candle — not a partial/in-progress open candle.            */

const POST_CLOSE_DELAY_MS = 3_000; // 3 s additional safety after settle

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ─── Per-Timeframe Analysis Loop ───────────────────────────────────── */
/* One instance per supported timeframe. Each watches its own candle     */
/* close timer and publishes snapshots independently.                    */
/*                                                                       */
/* Pipeline (only after closed candle):                                  */
/*   1. useClosedCandleKey fires (candle closed + settle elapsed)        */
/*   2. Wait POST_CLOSE_DELAY_MS for exchange API to stabilize           */
/*   3. Fetch market data (closed candle)                                */
/*   4. Run Analysis Engine                                              */
/*   5. Generate Snapshot                                                */
/*   6. Publish Snapshot (immutable — replace, never mutate)             */

/** Map app timeframe to Binance kline interval. */
const TF_TO_KLINES_INTERVAL: Record<TimeframeOption, string> = {
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

/** Fetch klines for all coins in parallel, return per-coin indicators map. */
async function fetchAllIndicators(
  tf: TimeframeOption,
): Promise<Record<string, import("@/lib/types").TechnicalIndicators>> {
  const interval = TF_TO_KLINES_INTERVAL[tf];
  const entries = Object.entries(COIN_SYMBOL_MAP); // [coinId, symbol][]
  const limit = 250; // enough for EMA200

  const results = await Promise.allSettled(
    entries.map(async ([coinId, symbol]) => {
      const klines = await fetchKlines(symbol, interval, limit);
      if (klines.length < 15) return null; // not enough data for RSI
      return { coinId, indicators: computeTechnicalIndicators(klines) };
    }),
  );

  const map: Record<string, import("@/lib/types").TechnicalIndicators> = {};
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      map[r.value.coinId] = r.value.indicators;
    }
  }
  return map;
}

function TimeframeLoop({ tf }: { tf: TimeframeOption }) {
  const lastClosedAt = useClosedCandleKey(tf);
  const refreshKey = useSnapshotStore((s) => s.refreshKey);
  const publishTimeframe = useSnapshotStore((s) => s.publishTimeframe);
  const setError = useSnapshotStore((s) => s.setError);
  const running = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (running.current) {
        pending.current = true;
        return;
      }
      running.current = true;
      pending.current = false;
      try {
        // Safety delay: ensure exchange has finalized the closed candle
        await delay(POST_CLOSE_DELAY_MS);
        if (cancelled) return;

        // Fetch market data + klines in parallel
        const [marketDataList, indicatorsMap] = await Promise.all([
          fetchMarketDataCached(),
          fetchAllIndicators(tf),
        ]);
        if (cancelled) return;

        // Run Analysis Engine with real technical indicators
        const legacyResults = analyzeAllCoins(marketDataList, indicatorsMap, tf, lastClosedAt);

        // Generate one immutable snapshot per coin for this timeframe
        const snapshots: Record<string, ReturnType<typeof buildSnapshotFromLegacy>> = {};
        for (const c of legacyResults) {
          snapshots[c.coinId] = buildSnapshotFromLegacy(c, tf);
        }

        // Publish (replaces old snapshots for this timeframe — never mutates)
        if (!cancelled) {
          publishTimeframe(tf, snapshots);
          setError(null); // clear on success

          // Fire-and-forget: notify server for transition detection + email
          fetch("/api/check-signals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeframe: tf }),
          }).catch(() => { /* background — failures are silent */ });
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[AnalysisProvider] ${tf} loop failed:`, err);
          setError(msg);
        }
      } finally {
        running.current = false;
        if (pending.current && !cancelled) {
          run();
        }
      }
    }

    run();
    return () => { cancelled = true; running.current = false; pending.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tf, lastClosedAt, refreshKey, publishTimeframe]);

  return null;
}

/* ─── Global Market Indicators ──────────────────────────────────────── */
/* Runs on 1h candle close (most stable timeframe for dominance stats).  */

function IndicatorsLoop() {
  const closed1h = useClosedCandleKey("1h");
  const refreshKey = useSnapshotStore((s) => s.refreshKey);
  const setIndicators = useSnapshotStore((s) => s.setIndicators);
  const setError = useSnapshotStore((s) => s.setError);
  const running = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (running.current) {
        pending.current = true;
        return;
      }
      running.current = true;
      pending.current = false;
      try {
        // Safety delay: ensure exchange has finalized the closed candle
        await delay(POST_CLOSE_DELAY_MS);
        if (cancelled) return;

        const marketDataList = await fetchMarketDataCached();
        if (cancelled) return;
        const indicators = await fetchGlobalMarketData(marketDataList);
        if (!cancelled) {
          setIndicators({
            totalMarketCap: indicators.totalMarketCap,
            totalVolume24h: indicators.totalVolume24h,
            btcDominance: indicators.btcDominance,
            ethDominance: indicators.ethDominance,
            bnbDominance: indicators.bnbDominance,
            othersDominance: indicators.othersDominance,
          });
          setError(null); // clear on success
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[AnalysisProvider] IndicatorsLoop failed:`, err);
          setError(msg);
        }
      } finally {
        running.current = false;
        if (pending.current && !cancelled) {
          run();
        }
      }
    }

    run();
    return () => { cancelled = true; running.current = false; pending.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed1h, refreshKey, setIndicators]);

  return null;
}

/* ─── Analysis Provider ─────────────────────────────────────────────── */
/* Spawns one TimeframeLoop per supported timeframe.                     */
/* All snapshots live in useSnapshotStore — no component fetches alone.  */

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {TIMEFRAME_OPTIONS.map((opt) => (
        <TimeframeLoop key={opt.value} tf={opt.value} />
      ))}
      <IndicatorsLoop />
      {children}
    </>
  );
}
