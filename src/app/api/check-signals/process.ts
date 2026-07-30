import { prisma } from "@/lib/prisma";
import { fetchKlines, fetchMarketDataList, COIN_SYMBOL_MAP } from "@/api/binance";
import { analyzeCoin } from "@/lib/analysisEngine";
import { computeTechnicalIndicators } from "@/lib/indicators";
import { sendSignalEmail } from "@/services/signal-notify";
import type { CoinAnalysis } from "@/lib/types";

// ─── OppKey (mirrors client-side logic, operates on CoinAnalysis) ────────

const NON_READY = new Set(["watch", "wait", "weakening", "invalid"]);
const READY = new Set(["ready_long", "ready_short"]);

function oppKey(c: CoinAnalysis): string {
  if (c.recommendation === "ready") {
    if (c.tradeSetup.direction === "long") return "ready_long";
    if (c.tradeSetup.direction === "short") return "ready_short";
    if (c.signal === "sell" || c.signal === "strong_sell") return "ready_short";
    if (c.signal === "buy" || c.signal === "strong_buy") return "ready_long";
    return "watch";
  }
  if (c.recommendation === "wait") {
    if (c.tradeSetup.direction) return "watch";
    return "wait";
  }
  return "invalid";
}

// ─── Fetch indicators for all coins ──

const TF_TO_KLINES: Record<string, string> = { "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d" };
const KLINES_LIMIT = 250;

async function fetchIndicators(tf: string): Promise<Record<string, import("@/lib/types").TechnicalIndicators>> {
  const interval = TF_TO_KLINES[tf] ?? tf;
  const entries = Object.entries(COIN_SYMBOL_MAP);

  const results = await Promise.allSettled(
    entries.map(async ([coinId, symbol]) => {
      const klines = await fetchKlines(symbol, interval, KLINES_LIMIT);
      if (klines.length < 15) return null;
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

// ─── Process one timeframe: run analysis, compare with DB, send emails ──

export async function processTimeframe(tf: string): Promise<{ checked: number; sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  // 1. Fetch market data + indicators
  const [marketDataList, indicatorsMap] = await Promise.all([
    fetchMarketDataList(),
    fetchIndicators(tf),
  ]);

  // 2. Run analysis engine for each coin
  const analyses: CoinAnalysis[] = [];
  for (const md of marketDataList) {
    const ind = indicatorsMap[md.id];
    if (!ind) continue;
    try {
      const result = analyzeCoin(md, ind, tf, Date.now(), Date.now());
      analyses.push(result);
    } catch (err) {
      errors.push(`analyze ${md.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // 3. Compare current state with DB, detect transitions
  const now = new Date();
  for (const c of analyses) {
    try {
      const currKey = oppKey(c);
      const prev = await prisma.signalState.findUnique({
        where: { coinId_timeframe: { coinId: c.coinId, timeframe: tf } },
      });

      const prevKey = prev?.recommendation ?? null;
      let isTransition = false;

      if (prevKey !== null) {
        // non-ready → ready
        if (NON_READY.has(prevKey) && READY.has(currKey)) isTransition = true;
        // ready → different ready (direction flip)
        if (READY.has(prevKey) && READY.has(currKey) && prevKey !== currKey) isTransition = true;
      }

      if (isTransition && (currKey === "ready_long" || currKey === "ready_short")) {
        // Send email to ALL users
        const users = await prisma.user.findMany({ select: { email: true } });
        const results = await Promise.allSettled(
          users
            .filter((u) => u.email)
            .map((u) =>
              sendSignalEmail({
                email: u.email,
                symbol: c.marketData.symbol,
                direction: currKey === "ready_long" ? "Long" : "Short",
                confidence: c.confidence ?? 50,
                price: c.marketData.currentPrice,
                coinId: c.coinId,
              }),
            ),
        );
        for (const r of results) {
          if (r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)) {
            errors.push(`email ${c.coinId}: ${r.status === "rejected" ? r.reason : r.value.error}`);
          } else {
            sent++;
          }
        }
      }

      // 4. Upsert state
      await prisma.signalState.upsert({
        where: { coinId_timeframe: { coinId: c.coinId, timeframe: tf } },
        create: {
          coinId: c.coinId,
          timeframe: tf,
          recommendation: currKey,
          direction: c.tradeSetup.direction ?? null,
          updatedAt: now,
        },
        update: {
          recommendation: currKey,
          direction: c.tradeSetup.direction ?? null,
          updatedAt: now,
        },
      });
    } catch (err) {
      errors.push(`db ${c.coinId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return { checked: analyses.length, sent, errors };
}
