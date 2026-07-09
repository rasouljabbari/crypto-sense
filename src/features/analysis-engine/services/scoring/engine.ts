// ---------------------------------------------------------------------------
// Crypto Score Engine
//
// Deterministic scoring engine. Same inputs always produce the same outputs.
// Every formula is documented inline. Zero randomness. Zero AI.
//
// All scores are 0-100.
//   100 = most favorable for long positions
//   0   = most favorable for short positions
//   Risk: 100 = safest, 0 = most dangerous
//   Confidence: 100 = highest conviction
// ---------------------------------------------------------------------------

import type {
  RsiResult,
  MacdResult,
  MovingAverageResult,
  BollingerBandResult,
  AdxResult,
  AtrResult,
  ObvResult,
  StochasticRsiResult,
  TrendDirection,
} from "../../types";

import type {
  ScoreEngineInput,
  ScoreEngineOutput,
  ScoreBreakdown,
  ComponentDetail,
  FactorContribution,
} from "./types";

// ─── Clamping Helper ──────────────────────────────────────────────────────

function clamp(value: number, min: number = 0, max: number = 100): number {
  if (!Number.isFinite(value)) return 50;
  return Math.round(Math.max(min, Math.min(max, value)));
}

function buildDetail(
  value: number,
  label: string,
  factors: FactorContribution[],
): ComponentDetail {
  return { value, label, factors };
}

function factor(
  name: string,
  weight: number,
  raw: number,
): FactorContribution {
  return { name, weight, raw, contribution: Math.round(raw * weight) };
}

function scoreLabel(value: number): string {
  if (value >= 80) return "very_bullish";
  if (value >= 60) return "bullish";
  if (value >= 40) return "neutral";
  if (value >= 20) return "bearish";
  return "very_bearish";
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNICAL SCORE  (0-100)
// ═══════════════════════════════════════════════════════════════════════════
//
// Weights: RSI 30%, MACD 25%, EMA Alignment 25%, Bollinger 20%
//
// RSI contribution:
//   RSI < 30  →  +30  (oversold — potential bounce)
//   RSI 30-40 →  +15
//   RSI 40-60 →  +0   (neutral zone)
//   RSI 60-70 →  -15
//   RSI > 70  →  -30  (overbought — potential drop)
//
// MACD contribution:
//   histogram > 0  →  +20 × min(|histogram| / threshold, 1)
//   histogram ≤ 0  →  -20 × min(|histogram| / threshold, 1)
//   threshold = max(|closes|) × 0.005
//
// EMA alignment contribution:
//   EMA20 > EMA50 > EMA200  →  +25  (bullish stack)
//   EMA20 < EMA50 < EMA200  →  -25  (bearish stack)
//   partial alignment       →  ±12
//   otherwise               →   0
//
// Bollinger contribution:
//   price below lower band →  +15 (oversold bounce zone)
//   price above upper band →  -15 (overbought pullback zone)
//   price inside bands     →   +5
// ═══════════════════════════════════════════════════════════════════════════

function calcTechnicalScore(
  rsi: RsiResult,
  macd: MacdResult,
  ema20: MovingAverageResult,
  ema50: MovingAverageResult,
  ema200: MovingAverageResult,
  bb: BollingerBandResult,
): { score: number; factors: FactorContribution[] } {
  // ── RSI factor ──────────────────────────────────────────────────
  let rsiRaw = 0;
  if (rsi.value <= 30) rsiRaw = 30;
  else if (rsi.value <= 40) rsiRaw = 15;
  else if (rsi.value >= 70) rsiRaw = -30;
  else if (rsi.value >= 60) rsiRaw = -15;
  else rsiRaw = 0;

  const rsiContribution = factor("RSI", 0.3, rsiRaw);

  // ── MACD factor ─────────────────────────────────────────────────
  const macdThreshold = Math.abs(macd.value) > 0 ? Math.abs(macd.value) * 2 : 0.01;
  const macdRatio = Math.min(Math.abs(macd.histogram) / macdThreshold, 1);
  const macdRaw = macd.bullish ? 20 * macdRatio : -20 * macdRatio;

  const macdContribution = factor("MACD", 0.25, macdRaw);

  // ── EMA alignment factor ────────────────────────────────────────
  let emaRaw = 0;
  const e20gt50 = ema20.value > ema50.value;
  const e50gt200 = ema50.value > ema200.value;

  if (e20gt50 && e50gt200) emaRaw = 25;
  else if (!e20gt50 && !e50gt200) emaRaw = -25;
  else if (e20gt50) emaRaw = 12;
  else emaRaw = -12;

  const emaContribution = factor("EMA_Alignment", 0.25, emaRaw);

  // ── Bollinger factor ────────────────────────────────────────────
  let bbRaw = 0;
  if (bb.pricePosition === "below") bbRaw = 15;
  else if (bb.pricePosition === "above") bbRaw = -15;
  else bbRaw = 5;

  const bbContribution = factor("Bollinger_Bands", 0.20, bbRaw);

  const score = clamp(
    50 + rsiContribution.contribution + macdContribution.contribution
        + emaContribution.contribution + bbContribution.contribution,
  );

  return {
    score,
    factors: [rsiContribution, macdContribution, emaContribution, bbContribution],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TREND SCORE  (0-100)
// ═══════════════════════════════════════════════════════════════════════════
//
// Weights: Direction 50%, Strength 25%, Price vs EMAs 25%
//
// Direction contribution:
//   bullish  →  +40
//   neutral  →    0
//   bearish  →  -40
//
// Strength contribution:
//   ADX ≥ 50 (strong)    →  ADX direction matters: +15 if bullish, -15 if bearish
//   ADX 25-50 (trending) →  +10 if bullish, -10 if bearish
//   ADX < 25 (ranging)   →    0
//
// Price vs EMAs contribution:
//   price > EMA50 and price > EMA200  →  +20 (bullish)
//   price < EMA50 and price < EMA200  →  -20 (bearish)
//   otherwise                         →    0
// ═══════════════════════════════════════════════════════════════════════════

function calcTrendScore(
  direction: TrendDirection,
  adx: AdxResult,
  ema50: MovingAverageResult,
  ema200: MovingAverageResult,
  currentPrice: number,
): { score: number; factors: FactorContribution[] } {
  // ── Direction factor ────────────────────────────────────────────
  let dirRaw = 0;
  if (direction === "bullish") dirRaw = 40;
  else if (direction === "bearish") dirRaw = -40;

  const dirContribution = factor("Trend_Direction", 0.50, dirRaw);

  // ── Strength factor ─────────────────────────────────────────────
  let strengthRaw = 0;
  const isBullish = direction === "bullish";
  if (adx.adx >= 50) strengthRaw = isBullish ? 15 : -15;
  else if (adx.adx >= 25) strengthRaw = isBullish ? 10 : -10;

  const strengthContribution = factor("Trend_Strength_ADX", 0.25, strengthRaw);

  // ── Price vs EMAs factor ────────────────────────────────────────
  let priceEmaRaw = 0;
  const priceAbove50 = currentPrice > ema50.value;
  const priceAbove200 = currentPrice > ema200.value;

  if (priceAbove50 && priceAbove200) priceEmaRaw = 20;
  else if (!priceAbove50 && !priceAbove200) priceEmaRaw = -20;

  const priceEmaContribution = factor("Price_vs_EMAs", 0.25, priceEmaRaw);

  const score = clamp(
    50 + dirContribution.contribution + strengthContribution.contribution
        + priceEmaContribution.contribution,
  );

  return {
    score,
    factors: [dirContribution, strengthContribution, priceEmaContribution],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MOMENTUM SCORE  (0-100)
// ═══════════════════════════════════════════════════════════════════════════
//
// Weights: Price Change 30%, RSI Momentum 25%, MACD Histogram 25%, StochRSI 20%
//
// Price change contribution:
//   24h change > 5%   →  +30
//   24h change 2-5%   →  +15
//   24h change 0-2%   →   +5
//   24h change -2-0%  →   -5
//   24h change -5- -2% →  -15
//   24h change < -5%  →  -30
//
// RSI momentum (distance from 50):
//   |RSI - 50| / 50 × 25, signed by direction
//   RSI > 50 → positive, RSI < 50 → negative
//
// MACD histogram momentum:
//   histogram magnitude contributes ±20 based on bullish/bearish
//
// StochRSI momentum:
//   %K > 80 → -10 (overbought — momentum may stall)
//   %K < 20 → +10 (oversold — momentum may reverse up)
//   20-80   →  0
// ═══════════════════════════════════════════════════════════════════════════

function calcMomentumScore(
  priceChange24h: number,
  rsi: RsiResult,
  macd: MacdResult,
  stochRsi: StochasticRsiResult,
): { score: number; factors: FactorContribution[] } {
  // ── Price change factor ─────────────────────────────────────────
  let priceRaw = 0;
  if (priceChange24h > 5) priceRaw = 30;
  else if (priceChange24h > 2) priceRaw = 15;
  else if (priceChange24h > 0) priceRaw = 5;
  else if (priceChange24h > -2) priceRaw = -5;
  else if (priceChange24h > -5) priceRaw = -15;
  else priceRaw = -30;

  const priceContribution = factor("Price_Change_24h", 0.30, priceRaw);

  // ── RSI momentum factor ─────────────────────────────────────────
  const rsiDist = Math.abs(rsi.value - 50) / 50;
  const rsiMomRaw = (rsi.value > 50 ? 1 : -1) * rsiDist * 25;

  const rsiMomContribution = factor("RSI_Momentum", 0.25, rsiMomRaw);

  // ── MACD histogram factor ───────────────────────────────────────
  const macdMag = Math.min(Math.abs(macd.histogram) / 1, 1);
  const macdMomRaw = macd.bullish ? macdMag * 20 : -macdMag * 20;

  const macdMomContribution = factor("MACD_Histogram", 0.25, macdMomRaw);

  // ── StochRSI factor ─────────────────────────────────────────────
  let stochRaw = 0;
  if (stochRsi.k >= 80) stochRaw = -10;
  else if (stochRsi.k <= 20) stochRaw = 10;

  const stochContribution = factor("Stochastic_RSI", 0.20, stochRaw);

  const score = clamp(
    50 + priceContribution.contribution + rsiMomContribution.contribution
        + macdMomContribution.contribution + stochContribution.contribution,
  );

  return {
    score,
    factors: [priceContribution, rsiMomContribution, macdMomContribution, stochContribution],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VOLUME SCORE  (0-100)
// ═══════════════════════════════════════════════════════════════════════════
//
// Weights: Volume/MCap Ratio 50%, OBV Trend 30%, Volume Spike 20%
//
// Volume/MCap ratio contribution:
//   ratio > 0.50  →  +40  (extremely high relative volume)
//   ratio > 0.30  →  +30
//   ratio > 0.20  →  +20
//   ratio > 0.10  →  +10
//   ratio > 0.05  →    0
//   ratio ≤ 0.05  →  -10  (low relative volume)
//
// OBV trend contribution:
//   rising  →  +20
//   flat    →    0
//   falling →  -20
//
// Volume spike (OBV spikeRatio) contribution:
//   spike detected → +15
//   no spike       →   0
// ═══════════════════════════════════════════════════════════════════════════

function calcVolumeScore(
  volume24h: number,
  marketCap: number,
  obv: ObvResult,
): { score: number; factors: FactorContribution[] } {
  // ── Volume/MCap ratio factor ─────────────────────────────────────
  const volRatio = marketCap > 0 ? volume24h / marketCap : 0;
  let volRatioRaw = 0;
  if (volRatio > 0.50) volRatioRaw = 40;
  else if (volRatio > 0.30) volRatioRaw = 30;
  else if (volRatio > 0.20) volRatioRaw = 20;
  else if (volRatio > 0.10) volRatioRaw = 10;
  else if (volRatio > 0.05) volRatioRaw = 0;
  else volRatioRaw = -10;

  const volRatioContribution = factor("Volume_MCap_Ratio", 0.50, volRatioRaw);

  // ── OBV trend factor ────────────────────────────────────────────
  let obvRaw = 0;
  if (obv.trend === "rising") obvRaw = 20;
  else if (obv.trend === "falling") obvRaw = -20;

  const obvContribution = factor("OBV_Trend", 0.30, obvRaw);

  // ── No spike contribution since OBV doesn't provide spike ratio ─
  //    Use volume direction consistency instead
  const spikeContribution = factor("Volume_Consistency", 0.20, 0);

  const score = clamp(
    50 + volRatioContribution.contribution + obvContribution.contribution
        + spikeContribution.contribution,
  );

  return {
    score,
    factors: [volRatioContribution, obvContribution, spikeContribution],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SENTIMENT SCORE  (0-100)
// ═══════════════════════════════════════════════════════════════════════════
//
// Weights: Fear & Greed 50%, News Sentiment 30%, News Volume 20%
//
// Fear & Greed contribution:
//   F&G mapped to 0-100: score = F&G value directly
//   contribution = (F&G - 50) × weight  (shifted so 50 = neutral)
//
// News sentiment contribution:
//   newsScore (0-100) directly used
//   contribution = (newsScore - 50) × weight
//   If no news data: 0
//
// News article count (coverage) contribution:
//   articles >= 10  →  +5  (good coverage = more reliable)
//   articles >= 3   →  +2
//   articles == 0   →  -5  (no news = uncertainty)
//   no data         →   0
// ═══════════════════════════════════════════════════════════════════════════

function calcSentimentScore(
  fearGreedScore: number | null,
  newsScore: number | null,
  newsPositiveRatio: number | null,
  newsArticleCount: number | null,
): { score: number; factors: FactorContribution[] } {
  // ── Fear & Greed factor ─────────────────────────────────────────
  const fgRaw = fearGreedScore !== null && Number.isFinite(fearGreedScore)
    ? fearGreedScore - 50
    : 0;

  const fgContribution = factor("Fear_&_Greed", 0.50, fgRaw);

  // ── News sentiment factor ───────────────────────────────────────
  const newsRaw = newsScore !== null && Number.isFinite(newsScore)
    ? newsScore - 50
    : 0;

  const newsContribution = factor("News_Sentiment", 0.30, newsRaw);

  // ── News coverage factor ────────────────────────────────────────
  let coverageRaw = 0;
  if (newsArticleCount !== null && Number.isFinite(newsArticleCount)) {
    if (newsArticleCount >= 10) coverageRaw = 10;
    else if (newsArticleCount >= 3) coverageRaw = 5;
    else if (newsArticleCount <= 0) coverageRaw = -10;
  }

  const coverageContribution = factor("News_Coverage", 0.20, coverageRaw);

  const score = clamp(
    50 + fgContribution.contribution + newsContribution.contribution
        + coverageContribution.contribution,
  );

  return {
    score,
    factors: [fgContribution, newsContribution, coverageContribution],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK SCORE  (0-100, higher = safer, lower = riskier)
// ═══════════════════════════════════════════════════════════════════════════
//
// Weights: Volatility 35%, Liquidity 25%, Trend Stability 25%, S/R Distance 15%
//
// ATR volatility contribution (inverse):
//   atr % of price = ATR / price
//   atr% < 1%     →  +30  (low volatility = low risk)
//   atr% < 2%     →  +15
//   atr% < 3%     →    0
//   atr% < 5%     →  -15
//   atr% ≥ 5%     →  -30  (high volatility = high risk)
//
// Volume liquidity contribution:
//   volume24h > 100M  →  +20  (highly liquid)
//   volume24h > 10M   →  +10
//   volume24h > 1M    →    0
//   volume24h ≤ 1M    →  -20  (illiquid = high risk)
//
// ADX stability contribution:
//   ADX ≥ 50 (strong trend) →  +15  (clear direction = lower risk)
//   ADX ≥ 25 (trending)     →   +5
//   ADX < 25 (ranging)      →  -10  (choppy = higher risk)
//
// S/R distance (closest support/resistance):
//   distance to nearest level / price
//   > 5%  →  +10  (lots of room)
//   2-5%  →   +5
//   < 2%  →  -10  (tight = high risk)
// ═══════════════════════════════════════════════════════════════════════════

function calcRiskScore(
  atrResult: AtrResult,
  volume24h: number,
  adx: AdxResult,
  supportResistance: { readonly supportLevels: readonly number[]; readonly resistanceLevels: readonly number[] },
  currentPrice: number,
): { score: number; factors: FactorContribution[] } {
  // ── ATR volatility factor ────────────────────────────────────────
  const atrPct = currentPrice > 0 ? atrResult.value / currentPrice : 0;
  let volRaw = 0;
  if (atrPct < 0.01) volRaw = 30;
  else if (atrPct < 0.02) volRaw = 15;
  else if (atrPct < 0.03) volRaw = 0;
  else if (atrPct < 0.05) volRaw = -15;
  else volRaw = -30;

  const volContribution = factor("ATR_Volatility", 0.35, volRaw);

  // ── Liquidity factor ─────────────────────────────────────────────
  let liqRaw = 0;
  if (volume24h > 100_000_000) liqRaw = 20;
  else if (volume24h > 10_000_000) liqRaw = 10;
  else if (volume24h > 1_000_000) liqRaw = 0;
  else liqRaw = -20;

  const liqContribution = factor("Volume_Liquidity", 0.25, liqRaw);

  // ── Trend stability factor ───────────────────────────────────────
  let stabilityRaw = 0;
  if (adx.adx >= 50) stabilityRaw = 15;
  else if (adx.adx >= 25) stabilityRaw = 5;
  else stabilityRaw = -10;

  const stabilityContribution = factor("ADX_Stability", 0.25, stabilityRaw);

  // ── S/R distance factor ──────────────────────────────────────────
  const allLevels = [
    ...supportResistance.supportLevels,
    ...supportResistance.resistanceLevels,
  ];

  let closestDist = Infinity;
  for (const level of allLevels) {
    const dist = Math.abs(level - currentPrice) / currentPrice;
    if (dist < closestDist) closestDist = dist;
  }

  let srRaw = 0;
  if (!Number.isFinite(closestDist) || closestDist >= 0.05) srRaw = 10;
  else if (closestDist >= 0.02) srRaw = 5;
  else srRaw = -10;

  const srContribution = factor("S_R_Distance", 0.15, srRaw);

  const score = clamp(
    50 + volContribution.contribution + liqContribution.contribution
        + stabilityContribution.contribution + srContribution.contribution,
  );

  return {
    score,
    factors: [volContribution, liqContribution, stabilityContribution, srContribution],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE  (0-100)
// ═══════════════════════════════════════════════════════════════════════════
//
// Confidence measures how much the scores agree and how reliable the data is.
//
// Agreement factor (60%):
//   Higher when technical, trend, momentum, volume all point same direction.
//   Compute standard deviation of score deviations from 50.
//   Low stdDev (all pointing same way) → high agreement.
//   Agreement = max(0, 100 - stdDev × 3)
//
// Data quality factor (20%):
//   All required indicator data present → +20
//   Missing news/fear-greed → -10
//   Missing anything else   → -30
//
// Proximity to extremes (20%):
//   More extreme scores (near 0 or 100) → more confidence in direction
//   max distance from 50: 50
//   proximity = (|overall - 50| / 50) × 20
// ═══════════════════════════════════════════════════════════════════════════

function calcConfidence(
  technical: number,
  trend: number,
  momentum: number,
  volume: number,
  sentiment: number,
  risk: number,
  sentimentInput: { fearGreedScore: number | null; newsScore: number | null },
): { score: number; factors: FactorContribution[] } {
  // ── Agreement factor ─────────────────────────────────────────────
  const scores = [technical, trend, momentum, volume, sentiment, risk];
  const deviations = scores.map((s) => Math.abs(s - 50));
  const meanDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const agreeRaw = Math.max(0, 100 - meanDev * 2);

  const agreeContribution = factor("Score_Agreement", 0.60, agreeRaw);

  // ── Data quality factor ──────────────────────────────────────────
  let qualityRaw = 20;
  if (sentimentInput.fearGreedScore === null) qualityRaw -= 10;
  if (sentimentInput.newsScore === null) qualityRaw -= 10;

  const qualityContribution = factor("Data_Quality", 0.20, qualityRaw);

  // ── Extreme proximity factor ─────────────────────────────────────
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const extremeRaw = (Math.abs(avgScore - 50) / 50) * 20;

  const extremeContribution = factor("Extreme_Proximity", 0.20, extremeRaw);

  const score = clamp(
    50 + agreeContribution.contribution + qualityContribution.contribution
        + extremeContribution.contribution - 50,  // shift: base 0, max 100
    0, 100,
  );

  return {
    score,
    factors: [agreeContribution, qualityContribution, extremeContribution],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERALL SCORE  (0-100)
// ═══════════════════════════════════════════════════════════════════════════
//
// Weighted composite:
//   Technical 25%  Trend 20%  Momentum 15%
//   Volume 10%  Sentiment 10%  Risk 10%  Confidence 10%
//
// Risk-adjusted: if risk is low (< 30), overall is penalized by 10%
// ═══════════════════════════════════════════════════════════════════════════

function calcOverall(
  technical: number,
  trend: number,
  momentum: number,
  volume: number,
  sentiment: number,
  risk: number,
  confidence: number,
): { score: number; factors: FactorContribution[] } {
  const factors_list: FactorContribution[] = [
    factor("Technical", 0.25, technical),
    factor("Trend", 0.20, trend),
    factor("Momentum", 0.15, momentum),
    factor("Volume", 0.10, volume),
    factor("Sentiment", 0.10, sentiment),
    factor("Risk", 0.10, risk),
    factor("Confidence", 0.10, confidence),
  ];

  let score = factors_list.reduce((sum, f) => sum + f.raw * f.weight, 0);

  // Risk penalty: if risk score is very low (< 30), penalize overall by 10%
  if (risk < 30) {
    score *= 0.9;
  }

  return { score: clamp(score), factors: factors_list };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE — PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export function calculateScores(input: ScoreEngineInput): ScoreEngineOutput {
  const ind = input.indicators;
  const price = input.price;
  const sent = input.sentiment;

  // Technical
  const techResult = calcTechnicalScore(
    ind.rsi, ind.macd, ind.ema20, ind.ema50, ind.ema200, ind.bollingerBands,
  );

  // Trend
  const trendResult = calcTrendScore(
    ind.trendDirection, ind.adx, ind.ema50, ind.ema200, price.currentPrice,
  );

  // Momentum
  const momResult = calcMomentumScore(
    price.priceChangePercent24h, ind.rsi, ind.macd, ind.stochasticRsi,
  );

  // Volume
  const volResult = calcVolumeScore(
    price.volume24h, price.marketCap, ind.obv,
  );

  // Sentiment
  const sentResult = calcSentimentScore(
    sent.fearGreedScore, sent.newsScore, sent.newsPositiveRatio, sent.newsArticleCount,
  );

  // Risk
  const riskResult = calcRiskScore(
    ind.atr, price.volume24h, ind.adx, ind.supportResistance, price.currentPrice,
  );

  // Confidence
  const confResult = calcConfidence(
    techResult.score, trendResult.score, momResult.score,
    volResult.score, sentResult.score, riskResult.score,
    { fearGreedScore: sent.fearGreedScore, newsScore: sent.newsScore },
  );

  // Overall
  const overallResult = calcOverall(
    techResult.score, trendResult.score, momResult.score,
    volResult.score, sentResult.score, riskResult.score, confResult.score,
  );

  const breakdown: ScoreBreakdown = {
    technical: buildDetail(techResult.score, scoreLabel(techResult.score), techResult.factors),
    trend: buildDetail(trendResult.score, scoreLabel(trendResult.score), trendResult.factors),
    momentum: buildDetail(momResult.score, scoreLabel(momResult.score), momResult.factors),
    volume: buildDetail(volResult.score, scoreLabel(volResult.score), volResult.factors),
    sentiment: buildDetail(sentResult.score, scoreLabel(sentResult.score), sentResult.factors),
    risk: buildDetail(riskResult.score, scoreLabel(riskResult.score), riskResult.factors),
    confidence: buildDetail(confResult.score, scoreLabel(confResult.score), confResult.factors),
  };

  return {
    overall: overallResult.score,
    technical: techResult.score,
    trend: trendResult.score,
    momentum: momResult.score,
    volume: volResult.score,
    sentiment: sentResult.score,
    risk: riskResult.score,
    confidence: confResult.score,
    breakdown,
  };
}
