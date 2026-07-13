import { SCORING_CONFIG as C } from "./config";
import type {
  ScoreEngineInput,
  ScoreEngineOutput,
  ScoreBreakdown,
  ComponentDetail,
  FactorContribution,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const round = (v: number) => Math.round(v * 10) / 10;

function factor(
  name: string,
  raw: number,
  reason: string,
): FactorContribution {
  return { name, weight: 1, raw, contribution: raw, reason };
}

function sumFactors(factors: readonly FactorContribution[]): number {
  return factors.reduce((s, f) => s + f.contribution, 0);
}

function deriveStatus(value: number): string {
  if (value >= 75) return "Strong Bullish";
  if (value >= 60) return "Bullish";
  if (value >= 45) return "Neutral";
  if (value >= 30) return "Bearish";
  return "Strong Bearish";
}

function deriveExplanation(label: string, value: number, reasons: readonly string[]): string {
  const status = deriveStatus(value).toLowerCase();
  if (reasons.length === 0) {
    return `${label} is neutral with no strong signals.`;
  }
  const top = reasons[0].replace(/\.$/, "").toLowerCase();
  return `${label} is ${status}. ${reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1)}`;
}

function dim(
  label: string,
  raw: number,
  factors: readonly FactorContribution[],
): { detail: ComponentDetail; raw: number } {
  const value = clamp(round(50 + raw), 0, 100);
  const reasons = factors.map((f) => f.reason);
  return {
    detail: {
      value,
      label,
      status: deriveStatus(value),
      explanation: deriveExplanation(label, value, reasons),
      factors,
    },
    raw,
  };
}

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------

function evaluateTrend(i: ScoreEngineInput): {
  detail: ComponentDetail;
  raw: number;
} {
  const f: FactorContribution[] = [];
  const { ema20, ema50, ema200, adx } = i.indicators;
  const cfg = C.trend;

  // ── EMA alignment ────────────────────────────────────────────────────────
  if (ema20.value > ema50.value && ema50.value > ema200.value) {
    f.push(
      factor(
        "EMA Alignment",
        cfg.emaAlignment.fullBull,
        "Strong bullish alignment: EMA20 > EMA50 > EMA200",
      ),
    );
  } else if (ema20.value > ema50.value) {
    f.push(
      factor(
        "EMA Alignment",
        cfg.emaAlignment.partialBull,
        "Bullish partial alignment: EMA20 > EMA50",
      ),
    );
  } else if (ema20.value < ema50.value && ema50.value < ema200.value) {
    f.push(
      factor(
        "EMA Alignment",
        cfg.emaAlignment.fullBear,
        "Strong bearish alignment: EMA20 < EMA50 < EMA200",
      ),
    );
  } else if (ema20.value < ema50.value) {
    f.push(
      factor(
        "EMA Alignment",
        cfg.emaAlignment.partialBear,
        "Bearish partial alignment: EMA20 < EMA50",
      ),
    );
  } else {
    f.push(factor("EMA Alignment", cfg.emaAlignment.mixed, "Mixed EMA alignment"));
  }

  // ── ADX strength ─────────────────────────────────────────────────────────
  const adxVal = adx.adx;
  if (adxVal > 35) {
    f.push(
      factor(
        "ADX Strength",
        cfg.adxStrength.strong,
        `Strong trend: ADX = ${adxVal.toFixed(1)}`,
      ),
    );
  } else if (adxVal > 25) {
    f.push(
      factor(
        "ADX Strength",
        cfg.adxStrength.trending,
        `Trending: ADX = ${adxVal.toFixed(1)}`,
      ),
    );
  } else if (adxVal > 20) {
    f.push(
      factor(
        "ADX Strength",
        cfg.adxStrength.weak,
        `Weak trend: ADX = ${adxVal.toFixed(1)}`,
      ),
    );
  } else {
    f.push(
      factor(
        "ADX Strength",
        cfg.adxStrength.none,
        `No clear trend: ADX = ${adxVal.toFixed(1)}`,
      ),
    );
  }

  // ── Price vs EMA50 ───────────────────────────────────────────────────────
  if (i.price.currentPrice > ema50.value) {
    f.push(factor("Price vs EMA50", cfg.priceVsEma50.above, "Price above EMA50"));
  } else {
    f.push(factor("Price vs EMA50", cfg.priceVsEma50.below, "Price below EMA50"));
  }

  // ── Price vs EMA200 ──────────────────────────────────────────────────────
  if (i.price.currentPrice > ema200.value) {
    f.push(
      factor("Price vs EMA200", cfg.priceVsEma200.above, "Price above EMA200"),
    );
  } else {
    f.push(
      factor("Price vs EMA200", cfg.priceVsEma200.below, "Price below EMA200"),
    );
  }

  return dim("Trend", sumFactors(f), f);
}

// ---------------------------------------------------------------------------
// Momentum
// ---------------------------------------------------------------------------

function evaluateMomentum(i: ScoreEngineInput): {
  detail: ComponentDetail;
  raw: number;
} {
  const f: FactorContribution[] = [];
  const { rsi: rsiResult, macd: macdResult, stochasticRsi } = i.indicators;
  const cfg = C.momentum;

  // ── RSI ──────────────────────────────────────────────────────────────────
  const rsiVal = rsiResult.value;
  if (rsiVal < 30) {
    f.push(
      factor("RSI", cfg.rsi.oversold, `Oversold: RSI = ${rsiVal.toFixed(1)}`),
    );
  } else if (rsiVal < 40) {
    f.push(
      factor("RSI", cfg.rsi.low, `Low: RSI = ${rsiVal.toFixed(1)}`),
    );
  } else if (rsiVal <= 60) {
    f.push(
      factor("RSI", cfg.rsi.neutral, `Neutral: RSI = ${rsiVal.toFixed(1)}`),
    );
  } else if (rsiVal <= 70) {
    f.push(
      factor("RSI", cfg.rsi.high, `High: RSI = ${rsiVal.toFixed(1)}`),
    );
  } else {
    f.push(
      factor(
        "RSI",
        cfg.rsi.overbought,
        `Overbought: RSI = ${rsiVal.toFixed(1)}`,
      ),
    );
  }

  // ── MACD ─────────────────────────────────────────────────────────────────
  const macdLine = macdResult.value;
  const signalLine = macdResult.signal;
  const macdAboveSignal = macdLine > signalLine;

  if (macdResult.bullish && macdAboveSignal) {
    f.push(factor("MACD", cfg.macd.bullishCross, "Bullish MACD cross"));
  } else if (macdAboveSignal) {
    f.push(factor("MACD", cfg.macd.aboveSignal, "MACD above signal"));
  } else if (!macdResult.bullish && !macdAboveSignal) {
    f.push(factor("MACD", cfg.macd.bearishCross, "Bearish MACD cross"));
  } else {
    f.push(factor("MACD", cfg.macd.belowSignal, "MACD below signal"));
  }

  // ── Price change 24 h ────────────────────────────────────────────────────
  const pct = i.price.priceChangePercent24h;
  if (pct > 5) {
    f.push(
      factor(
        "Price Change",
        cfg.priceChange.strongBull,
        `Strong upward: +${pct.toFixed(1)}%`,
      ),
    );
  } else if (pct > 2) {
    f.push(
      factor(
        "Price Change",
        cfg.priceChange.bull,
        `Upward: +${pct.toFixed(1)}%`,
      ),
    );
  } else if (pct > 0) {
    f.push(
      factor(
        "Price Change",
        cfg.priceChange.weakBull,
        `Slightly upward: +${pct.toFixed(1)}%`,
      ),
    );
  } else if (pct > -2) {
    f.push(
      factor(
        "Price Change",
        cfg.priceChange.weakBear,
        `Slightly downward: ${pct.toFixed(1)}%`,
      ),
    );
  } else if (pct > -5) {
    f.push(
      factor(
        "Price Change",
        cfg.priceChange.bear,
        `Downward: ${pct.toFixed(1)}%`,
      ),
    );
  } else {
    f.push(
      factor(
        "Price Change",
        cfg.priceChange.strongBear,
        `Strong downward: ${pct.toFixed(1)}%`,
      ),
    );
  }

  // ── StochRSI ─────────────────────────────────────────────────────────────
  const stochVal = stochasticRsi.k;
  if (stochVal < 0.2) {
    f.push(
      factor(
        "StochRSI",
        cfg.stochRsi.oversold,
        `Oversold: StochRSI = ${stochVal.toFixed(3)}`,
      ),
    );
  } else if (stochVal > 0.8) {
    f.push(
      factor(
        "StochRSI",
        cfg.stochRsi.overbought,
        `Overbought: StochRSI = ${stochVal.toFixed(3)}`,
      ),
    );
  }

  return dim("Momentum", sumFactors(f), f);
}

// ---------------------------------------------------------------------------
// Volume
// ---------------------------------------------------------------------------

function evaluateVolume(i: ScoreEngineInput): {
  detail: ComponentDetail;
  raw: number;
} {
  const f: FactorContribution[] = [];
  const { obv: obvResult } = i.indicators;
  const cfg = C.volume;

  // ── OBV trend ────────────────────────────────────────────────────────────
  if (obvResult.trend === "rising") {
    f.push(factor("OBV Trend", cfg.obvTrend.rising, "OBV rising"));
  } else if (obvResult.trend === "falling") {
    f.push(factor("OBV Trend", cfg.obvTrend.falling, "OBV falling"));
  } else {
    f.push(factor("OBV Trend", cfg.obvTrend.flat, "OBV stable"));
  }

  // ── Volume / Market-Cap ratio ────────────────────────────────────────────
  const volMcCap =
    i.price.marketCap > 0 ? i.price.volume24h / i.price.marketCap : 0;
  if (volMcCap > 0.3) {
    f.push(
      factor(
        "Volume/MCap",
        cfg.volMcCap.high,
        `High activity: Vol/MCap = ${volMcCap.toFixed(2)}`,
      ),
    );
  } else if (volMcCap > 0.1) {
    f.push(
      factor(
        "Volume/MCap",
        cfg.volMcCap.medium,
        `Moderate activity: Vol/MCap = ${volMcCap.toFixed(2)}`,
      ),
    );
  } else if (volMcCap > 0.05) {
    f.push(
      factor(
        "Volume/MCap",
        cfg.volMcCap.low,
        `Low activity: Vol/MCap = ${volMcCap.toFixed(2)}`,
      ),
    );
  } else {
    f.push(
      factor(
        "Volume/MCap",
        cfg.volMcCap.veryLow,
        `Very low activity: Vol/MCap = ${volMcCap.toFixed(2)}`,
      ),
    );
  }

  return dim("Volume", sumFactors(f), f);
}

// ---------------------------------------------------------------------------
// Volatility
// ---------------------------------------------------------------------------

function evaluateVolatility(i: ScoreEngineInput): {
  detail: ComponentDetail;
  raw: number;
} {
  const f: FactorContribution[] = [];
  const { atr: atrResult, bollingerBands } = i.indicators;
  const cfg = C.volatility;

  // ── ATR % ────────────────────────────────────────────────────────────────
  const atrPct =
    i.price.currentPrice > 0
      ? (atrResult.value / i.price.currentPrice) * 100
      : 0;
  if (atrPct < 1) {
    f.push(
      factor(
        "ATR",
        cfg.atr.low,
        `Low volatility: ATR% = ${atrPct.toFixed(2)}%`,
      ),
    );
  } else if (atrPct < 3) {
    f.push(
      factor(
        "ATR",
        cfg.atr.normal,
        `Normal volatility: ATR% = ${atrPct.toFixed(2)}%`,
      ),
    );
  } else if (atrPct < 5) {
    f.push(
      factor(
        "ATR",
        cfg.atr.high,
        `High volatility: ATR% = ${atrPct.toFixed(2)}%`,
      ),
    );
  } else {
    f.push(
      factor(
        "ATR",
        cfg.atr.extreme,
        `Extreme volatility: ATR% = ${atrPct.toFixed(2)}%`,
      ),
    );
  }

  // ── Bollinger Band position ──────────────────────────────────────────────
  const price = i.price.currentPrice;
  const { upper, lower } = bollingerBands;
  if (price > upper) {
    f.push(
      factor(
        "Bollinger Position",
        cfg.bollinger.aboveUpper,
        "Price above upper Bollinger Band (overbought)",
      ),
    );
  } else if (price < lower) {
    f.push(
      factor(
        "Bollinger Position",
        cfg.bollinger.belowLower,
        "Price below lower Bollinger Band (oversold)",
      ),
    );
  } else {
    f.push(
      factor(
        "Bollinger Position",
        cfg.bollinger.inside,
        "Price inside Bollinger Bands",
      ),
    );
  }

  return dim("Volatility", sumFactors(f), f);
}

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

function evaluateRisk(i: ScoreEngineInput): {
  detail: ComponentDetail;
  raw: number;
} {
  const f: FactorContribution[] = [];
  const { adx: adxResult, supportResistance: sr } = i.indicators;
  const cfg = C.risk;

  // ── Liquidity (volume) ───────────────────────────────────────────────────
  const volM = i.price.volume24h / 1_000_000;
  if (volM > 100) {
    f.push(
      factor(
        "Liquidity",
        cfg.liquidity.high,
        `High liquidity: Vol = $${volM.toFixed(0)}M`,
      ),
    );
  } else if (volM > 10) {
    f.push(
      factor(
        "Liquidity",
        cfg.liquidity.medium,
        `Medium liquidity: Vol = $${volM.toFixed(1)}M`,
      ),
    );
  } else if (volM > 1) {
    f.push(
      factor(
        "Liquidity",
        cfg.liquidity.low,
        `Low liquidity: Vol = $${volM.toFixed(2)}M`,
      ),
    );
  } else {
    f.push(
      factor(
        "Liquidity",
        cfg.liquidity.veryLow,
        `Very low liquidity: Vol = $${(volM * 1000).toFixed(0)}K`,
      ),
    );
  }

  // ── S/R distance ─────────────────────────────────────────────────────────
  const nearestSupport =
    sr.supportLevels.length > 0
      ? Math.max(...sr.supportLevels.filter((l) => l < i.price.currentPrice), 0)
      : i.price.currentPrice * 0.9;
  const nearestResistance =
    sr.resistanceLevels.length > 0
      ? Math.min(
          ...sr.resistanceLevels.filter((l) => l > i.price.currentPrice),
          i.price.currentPrice * 2,
        )
      : i.price.currentPrice * 1.1;

  const srRange =
    i.price.currentPrice > 0
      ? Math.abs(nearestResistance - nearestSupport) / i.price.currentPrice
      : 0;
  if (srRange > 0.05) {
    f.push(
      factor(
        "S/R Distance",
        cfg.srDistance.wide,
        `Wide S/R range: ${(srRange * 100).toFixed(1)}%`,
      ),
    );
  } else if (srRange > 0.02) {
    f.push(
      factor(
        "S/R Distance",
        cfg.srDistance.normal,
        `Normal S/R range: ${(srRange * 100).toFixed(1)}%`,
      ),
    );
  } else {
    f.push(
      factor(
        "S/R Distance",
        cfg.srDistance.tight,
        `Tight S/R range: ${(srRange * 100).toFixed(1)}%`,
      ),
    );
  }

  // ── ADX stability ────────────────────────────────────────────────────────
  const adxVal = adxResult.adx;
  if (adxVal > 35) {
    f.push(
      factor(
        "ADX Stability",
        cfg.adxStability.clear,
        `Clear direction: ADX = ${adxVal.toFixed(1)}`,
      ),
    );
  } else if (adxVal > 20) {
    f.push(
      factor(
        "ADX Stability",
        cfg.adxStability.moderate,
        `Moderate direction: ADX = ${adxVal.toFixed(1)}`,
      ),
    );
  } else {
    f.push(
      factor(
        "ADX Stability",
        cfg.adxStability.choppy,
        `Choppy market: ADX = ${adxVal.toFixed(1)}`,
      ),
    );
  }

  return dim("Risk", sumFactors(f), f);
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

function evaluateConfidence(
  i: ScoreEngineInput,
  dimScores: number[],
): { detail: ComponentDetail; raw: number } {
  const f: FactorContribution[] = [];
  const cfg = C.confidence;

  // ── Dimension agreement ──────────────────────────────────────────────────
  const positive = dimScores.filter((s) => s > 0).length;
  const negative = dimScores.filter((s) => s < 0).length;
  const majority = Math.max(positive, negative);

  if (majority >= 5) {
    f.push(
      factor("Agreement", cfg.agreement.full, "All dimensions agree"),
    );
  } else if (majority >= 4) {
    f.push(
      factor("Agreement", cfg.agreement.partial, "Most dimensions agree"),
    );
  } else if (majority >= 3) {
    f.push(
      factor("Agreement", cfg.agreement.mixed, "Mixed signals"),
    );
  } else {
    f.push(
      factor(
        "Agreement",
        cfg.agreement.conflicting,
        "Conflicting signals",
      ),
    );
  }

  // ── Data quality ─────────────────────────────────────────────────────────
  const missing = [
    i.sentiment.fearGreedScore === null,
    i.sentiment.newsScore === null,
    i.sentiment.newsPositiveRatio === null,
    i.sentiment.newsArticleCount === null,
  ].filter(Boolean).length;

  if (missing === 0) {
    f.push(
      factor("Data Quality", cfg.dataQuality.complete, "All data available"),
    );
  } else if (missing <= 2) {
    f.push(
      factor(
        "Data Quality",
        cfg.dataQuality.minorMissing,
        "Some data missing",
      ),
    );
  } else {
    f.push(
      factor(
        "Data Quality",
        cfg.dataQuality.majorMissing,
        "Significant data missing",
      ),
    );
  }

  return dim("Confidence", sumFactors(f), f);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateScores(input: ScoreEngineInput): ScoreEngineOutput {
  const trend = evaluateTrend(input);
  const momentum = evaluateMomentum(input);
  const volume = evaluateVolume(input);
  const volatility = evaluateVolatility(input);
  const risk = evaluateRisk(input);
  const confidence = evaluateConfidence(input, [
    trend.raw,
    momentum.raw,
    volume.raw,
    volatility.raw,
    risk.raw,
  ]);

  const overall = clamp(
    Math.round(
      trend.detail.value * C.weights.trend +
      momentum.detail.value * C.weights.momentum +
      volume.detail.value * C.weights.volume +
      volatility.detail.value * C.weights.volatility +
      risk.detail.value * C.weights.risk
    ),
    0,
    100,
  );

  const breakdown: ScoreBreakdown = {
    technical: { value: overall, label: "Technical", status: deriveStatus(overall), explanation: "", factors: [] },
    trend: trend.detail,
    momentum: momentum.detail,
    volume: volume.detail,
    volatility: volatility.detail,
    sentiment: { value: 50, label: "Sentiment", status: "Neutral", explanation: "Sentiment data not available.", factors: [] },
    risk: risk.detail,
    confidence: confidence.detail,
  };

  return {
    overall,
    technical: overall,
    trend: trend.detail.value,
    momentum: momentum.detail.value,
    volume: volume.detail.value,
    volatility: volatility.detail.value,
    sentiment: 50,
    risk: risk.detail.value,
    confidence: confidence.detail.value,
    breakdown,
  };
}
