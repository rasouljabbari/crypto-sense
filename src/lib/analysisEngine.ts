import { MarketData, TechnicalIndicators, TrendAnalysis, SentimentData, NewsItem, CoinAnalysis, PositionType, SignalType, RiskLevel, TrendLabel, TradeStatus, TradeSetupData } from "./types";
import { generateTechnicalIndicators, MOCK_NEWS } from "./mockData";
import { generateRecommendation } from "./recommendationEngine";
import { generateTradeSetup } from "indicator-engine/risk-management-engine";
import { trendStrength } from "indicator-engine";

// ── helpers ────────────────────────────────────────────────
function cap(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function isBullTrend(tl: TrendLabel): boolean {
  return tl === "bullish" || tl === "strong_bullish";
}
function isBearTrend(tl: TrendLabel): boolean {
  return tl === "bearish" || tl === "strong_bearish";
}

// ── sub-scores ─────────────────────────────────────────────

function calculateVolumeScore(volume24h: number, marketCap: number): number {
  const ratio = volume24h / marketCap;
  if (ratio > 0.5) return 95;
  if (ratio > 0.3) return 85;
  if (ratio > 0.2) return 75;
  if (ratio > 0.1) return 60;
  if (ratio > 0.05) return 45;
  if (ratio > 0.02) return 35;
  return 25;
}

function calculateTrendScore(priceChange: number, indicators: TechnicalIndicators, marketData: MarketData): number {
  let score = 50;
  score += priceChange * 2;

  const { rsi, macd } = indicators;
  if (rsi < 30) score += 20;
  else if (rsi < 40) score += 10;
  else if (rsi > 70) score -= 20;
  else if (rsi > 60) score -= 10;

  if (macd.histogram > 0) score += 10;
  else score -= 10;

  if (indicators.ema9 > indicators.ema21) score += 10;
  else score -= 10;

  if (indicators.ema21 > indicators.ema50) score += 5;
  else score -= 5;

  const bullishAlign = indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50;
  const bearishAlign = indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50;
  if (bullishAlign) score += 8;
  if (bearishAlign) score -= 8;

  const volMcapRatio = marketData.marketCap > 0 ? marketData.volume24h / marketData.marketCap : 0;
  if (priceChange > 0 && volMcapRatio > 0.1) score += 5;
  else if (priceChange < 0 && volMcapRatio > 0.1) score -= 5;

  return cap(score);
}

function calculateSentimentScore(news: NewsItem[], coinId: string): number {
  const relevantNews = news.filter(n => n.relatedCoins.includes(coinId));
  if (relevantNews.length === 0) return 50;
  let score = 50;
  for (const n of relevantNews) {
    if (n.sentiment === "positive") score += 10;
    else if (n.sentiment === "negative") score -= 10;
  }
  return cap(score);
}

function calculateTechnicalScore(indicators: TechnicalIndicators): number {
  const { rsi, macd } = indicators;
  let score = 50;

  if (rsi <= 30) score = 80;
  else if (rsi >= 70) score = 20;
  else if (rsi < 50) score = 50 + (50 - rsi) * 1.5;
  else score = 50 - (rsi - 50) * 1.5;

  if (macd.histogram > 0) {
    const mag = Math.min(Math.abs(macd.histogram) / 2, 1);
    score += 15 * mag;
  } else {
    const mag = Math.min(Math.abs(macd.histogram) / 2, 1);
    score -= 15 * mag;
  }

  const bullishAlign = indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50;
  const bearishAlign = indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50;
  if (bullishAlign) score += 10;
  if (bearishAlign) score -= 10;

  return cap(score);
}

// ── momentum score ───────────────────────────────────────

function calculateMomentumScore(indicators: TechnicalIndicators): number {
  const { rsi, macd, adx } = indicators;
  let score = 50;

  // MACD histogram — primary momentum signal
  if (macd.histogram > 0) {
    const mag = Math.min(Math.abs(macd.histogram) / 2, 1);
    score += 20 * mag;
  } else {
    const mag = Math.min(Math.abs(macd.histogram) / 2, 1);
    score -= 20 * mag;
  }

  // ADX — trend strength amplifies momentum reading
  if (adx >= 30) score += 15;
  else if (adx >= 20) score += 8;
  else score -= 5;

  // RSI — overbought/oversold dampens momentum conviction
  if (rsi > 80) score -= 10;
  else if (rsi < 20) score -= 10;

  // MACD crossover alignment
  if (macd.value > macd.signal) score += 5;
  else score -= 5;

  return cap(score);
}

// ── position + overall score ──────────────────────────────

function determinePosition(
  trendScore: number,
  volumeScore: number,
  sentimentScore: number,
  technicalScore: number
): { position: PositionType; overallScore: number } {
  const overallScore = cap(
    trendScore * 0.30 + volumeScore * 0.25 + sentimentScore * 0.15 + technicalScore * 0.30
  );

  let position: PositionType;
  if (overallScore >= 60) position = "long";
  else if (overallScore <= 40) position = "short";
  else position = "neutral";

  return { position, overallScore };
}

// ── trend ──────────────────────────────────────────────────

function generateTrendAnalysis(
  priceChangePercent: number,
  ti: TechnicalIndicators,
): TrendAnalysis {
  const ema9 = ti.ema9;
  const ema20 = ti.ema20;
  const ema50 = ti.ema50;
  const ema200 = ti.ema200;
  const adx = ti.adx;
  const macd = ti.macd;
  const rsi = ti.rsi;

  // ── helpers ──────────────────────────────────────────────────────────
  function classifyTrend(bullish: boolean, bearish: boolean): "bullish" | "bearish" | "neutral" {
    if (bullish) return "bullish";
    if (bearish) return "bearish";
    return "neutral";
  }

  function classifyStrength(trend: "bullish" | "bearish" | "neutral", adxVal: number, histAbs: number): "strong" | "moderate" | "weak" {
    if (trend === "neutral") return adxVal >= 25 ? "moderate" : "weak";
    if (adxVal >= 30 && histAbs > 0.5) return "strong";
    if (adxVal >= 20) return "moderate";
    return "weak";
  }

  function calcConfidence(trend: "bullish" | "bearish" | "neutral", adxVal: number, emaAligned: boolean, histDir: boolean): number {
    let c = 50;
    if (trend !== "neutral") c += 15;
    if (emaAligned) c += 12;
    if (adxVal >= 25) c += 10;
    else if (adxVal < 15) c -= 10;
    if (histDir) c += 8;
    else c -= 5;
    if (rsi > 70 || rsi < 30) c += 5;
    return cap(c);
  }

  // ── 15M — fast-reacting (RSI + MACD + EMA9/21) ──────────────────────
  const histAbs = Math.abs(macd.histogram);
  const ema9Above21 = ema9 > ema20;
  const ema9Below21 = ema9 < ema20;
  const macdBullish = macd.value > macd.signal;
  const macdBearish = macd.value < macd.signal;

  const t15m = classifyTrend(
    ema9Above21 && macdBullish && rsi > 40 && rsi < 70,
    ema9Below21 && macdBearish && rsi < 60 && rsi > 30,
  );
  const s15m = classifyStrength(t15m, adx, histAbs);
  const c15m = calcConfidence(t15m, adx, ema9Above21 || ema9Below21, macdBullish || macdBearish);

  // ── 1H — balanced (EMA9/21 + EMA21/50 + MACD + ADX) ────────────────
  const ema21Above50 = ema20 > ema50;
  const ema21Below50 = ema20 < ema50;
  const emaAlignedBull = ema9Above21 && ema21Above50;
  const emaAlignedBear = ema9Below21 && ema21Below50;

  const t1h = classifyTrend(
    emaAlignedBull && (macdBullish || adx >= 25),
    emaAlignedBear && (macdBearish || adx >= 25),
  );
  const s1h = classifyStrength(t1h, adx, histAbs);
  const c1h = calcConfidence(t1h, adx, emaAlignedBull || emaAlignedBear, macdBullish || macdBearish);

  // ── 4H — slower (EMA21/50 + EMA50/200 + ADX) ───────────────────────
  const ema50Above200 = ema50 > ema200;
  const ema50Below200 = ema50 < ema200;
  const strongTrend = adx >= 25;

  const t4h = classifyTrend(
    ema21Above50 && ema50Above200 && strongTrend,
    ema21Below50 && ema50Below200 && strongTrend,
  );
  const s4h = classifyStrength(t4h, adx, histAbs);
  const c4h = calcConfidence(t4h, adx, ema21Above50 || ema21Below50, macdBullish || macdBearish);

  // ── 1D — macro (EMA50/200 + price change + ADX) ────────────────────
  const priceChangeBull = priceChangePercent > 3;
  const priceChangeBear = priceChangePercent < -3;

  const t1d = classifyTrend(
    ema50Above200 && priceChangeBull && strongTrend,
    ema50Below200 && priceChangeBear && strongTrend,
  );
  const s1d = classifyStrength(t1d, adx, histAbs);
  const c1d = calcConfidence(t1d, adx, ema50Above200 || ema50Below200, macdBullish || macdBearish);

  // ── composite score ──────────────────────────────────────────────────
  let score = 50;
  if (ema9Above21 && ema21Above50 && ema50Above200) score += 25;
  else if (ema9Above21 && ema21Above50) score += 15;
  else if (ema50Above200) score += 8;
  if (ema9Below21 && ema21Below50 && ema50Below200) score -= 25;
  else if (ema9Below21 && ema21Below50) score -= 15;
  else if (ema50Below200) score -= 8;
  if (strongTrend && macdBullish) score += 10;
  if (strongTrend && macdBearish) score -= 10;
  if (rsi > 70) score -= 5;
  if (rsi < 30) score += 5;
  score = cap(score);

  return {
    "15m": { trend: t15m, strength: s15m, confidence: c15m },
    "1h":  { trend: t1h,  strength: s1h,  confidence: c1h },
    "4h":  { trend: t4h,  strength: s4h,  confidence: c4h },
    "1d":  { trend: t1d,  strength: s1d,  confidence: c1d },
    score,
  };
}

function computeTrendLabel(ti: TechnicalIndicators): TrendLabel {
  const ema20 = ti.ema20;
  const ema50 = ti.ema50;
  const ema200 = ti.ema200;
  const adx = ti.adx;
  const macdHist = ti.macd.histogram;

  const emaBullish = ema20 > ema50 && ema50 > ema200;
  const emaBearish = ema20 < ema50 && ema50 < ema200;
  const emaMixed = !emaBullish && !emaBearish;

  const momentumUp = macdHist > 0;
  const momentumDown = macdHist < 0;
  const trendUp = adx >= 20 && momentumUp;
  const trendDown = adx >= 20 && momentumDown;

  if (emaBullish && adx >= 25 && macdHist > 0) return "strong_bullish";
  if (emaBearish && adx >= 25 && macdHist < 0) return "strong_bearish";
  if (emaBullish && adx >= 20) return "bullish";
  if (emaBearish && adx >= 20) return "bearish";
  if (emaMixed && trendUp) return "bullish";
  if (emaMixed && trendDown) return "bearish";
  if (emaBullish && adx < 20) return "sideways";
  if (emaBearish && adx < 20) return "sideways";

  return "sideways";
}

// ── signal (must never contradict trendLabel) ─────────────

function computeSignal(
  position: PositionType,
  overallScore: number,
  trendLabel: TrendLabel,
  macdHistogram: number,
  adx: number,
): SignalType {
  const bullTrend = isBullTrend(trendLabel);
  const bearTrend = isBearTrend(trendLabel);

  // position=long but trend is bearish → neutral (contradiction guard)
  if (position === "long" && bearTrend) {
    return "neutral";
  }
  // position=short but trend is bullish → neutral
  if (position === "short" && bullTrend) {
    return "neutral";
  }
  // neutral position with neutral/sideways trend → neutral
  if (position === "neutral") {
    if (overallScore >= 60) return "buy";
    if (overallScore <= 40) return "sell";
    return "neutral";
  }

  // long + bullish/neutral trend
  if (position === "long") {
    if (overallScore >= 80 && bullTrend && macdHistogram > 0 && adx >= 25)
      return "strong_buy";
    return "buy";
  }

  // short + bearish/neutral trend
  if (position === "short") {
    if (overallScore <= 20 && bearTrend && macdHistogram < 0 && adx >= 25)
      return "strong_sell";
    return "sell";
  }

  return "neutral";
}

// ── confidence (weighted, not binary) ─────────────────────

function computeConfidence(
  volumeScore: number,
  trendScore: number,
  technicalScore: number,
  sentimentScore: number,
  overallScore: number,
  position: PositionType,
): number {
  // Weighted average of raw scores (each sub-score contributes)
  const raw = volumeScore * 0.15 + trendScore * 0.35 + technicalScore * 0.35 + sentimentScore * 0.15;

  // Bonus: overallScore alignment with position direction
  let bonus = 0;
  if (position === "long") {
    if (overallScore >= 75) bonus = 15;
    else if (overallScore >= 60) bonus = 10;
  } else if (position === "short") {
    if (overallScore <= 25) bonus = 15;
    else if (overallScore <= 40) bonus = 10;
  } else {
    // neutral: score near 50 = best
    if (overallScore >= 45 && overallScore <= 55) bonus = 10;
  }

  return cap(raw + bonus);
}

// ── risk ───────────────────────────────────────────────────

function computeRiskScore(coin: {
  position: PositionType;
  overallScore: number;
  trendLabel: TrendLabel;
  technicalIndicators: TechnicalIndicators;
}): number {
  let score = 0;
  const trendMatch =
    (coin.position === "long" && isBullTrend(coin.trendLabel)) ||
    (coin.position === "short" && isBearTrend(coin.trendLabel));
  if (trendMatch) score += 30;
  else if (coin.trendLabel === "sideways") score += 15;
  score += (coin.overallScore / 100) * 25;

  const rsi = coin.technicalIndicators.rsi;
  if (coin.position === "long") {
    if (rsi < 30) score += 25;
    else if (rsi < 50) score += 20;
    else if (rsi < 70) score += 10;
  } else if (coin.position === "short") {
    if (rsi > 70) score += 25;
    else if (rsi > 50) score += 20;
    else if (rsi > 30) score += 10;
  } else {
    score += 10;
  }
  return cap(score);
}

// ── trade quality (separate from risk) ────────────────────

function computeTradeQuality(
  position: PositionType,
  trendLabel: TrendLabel,
  technicalScore: number,
  volumeScore: number,
  overallScore: number,
  adx: number,
): number {
  // Base: technical + volume with higher weights
  let q = technicalScore * 0.45 + volumeScore * 0.30;

  // Bonus: trend aligns with position
  const trendAlign =
    (position === "long" && isBullTrend(trendLabel)) ||
    (position === "short" && isBearTrend(trendLabel));
  if (trendAlign) q += 15;

  // Bonus: clear directional score
  if (position === "long" && overallScore >= 65) q += 10;
  if (position === "short" && overallScore <= 35) q += 10;

  // Bonus: strong trend
  if (adx >= 25) q += 10;
  // Bonus: moderate trend
  else if (adx >= 20) q += 5;

  return cap(q);
}

// ── risk level ────────────────────────────────────────────

function computeRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 70) return "low";
  if (riskScore >= 40) return "medium";
  return "high";
}

// ── risk / reward ─────────────────────────────────────────

function computeRiskReward(
  price: number,
  supportLevels: number[],
  resistanceLevels: number[],
  position: PositionType,
  atr: number,
): string | null {
  if (position === "neutral") return null;

  // Try support/resistance-based R:R first
  const nearestSupport = supportLevels.length > 0 ? Math.max(...supportLevels.filter(s => s < price)) : null;
  const nearestResistance = resistanceLevels.length > 0 ? Math.min(...resistanceLevels.filter(r => r > price)) : null;
  if (nearestSupport && nearestResistance) {
    let ratio: number;
    if (position === "long") {
      ratio = (nearestResistance - price) / (price - nearestSupport);
    } else {
      ratio = (price - nearestSupport) / (nearestResistance - price);
    }
    if (ratio >= 3) return "1:3";
    if (ratio >= 2.5) return "1:2.5";
    if (ratio >= 2) return "1:2";
    // If ratio < 2 but we have valid levels, still return the ratio
    return `1:${ratio.toFixed(1)}`;
  }

  // Fallback: use ATR to estimate SL/TP distances
  if (atr > 0 && price > 0) {
    const stopDist = atr * 1.5;
    const takeDist = atr * 3;
    // Ensure we don't go below 0
    if (stopDist < price && takeDist < price * 10) {
      const ratio = takeDist / stopDist; // 2.0 by construction
      if (ratio >= 3) return "1:3";
      if (ratio >= 2.5) return "1:2.5";
      if (ratio >= 2) return "1:2";
      return `1:${ratio.toFixed(1)}`;
    }
  }

  return null;
}

// ── validation layer ──────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  reason: string | null;
}

function validateInternalConsistency(coin: CoinAnalysis): ValidationResult {
  const { signal, trendLabel, position, overallScore, riskLevel, recommendation } = coin;

  // 1. Signal vs Trend: signal must respect trend direction
  if (signal === "buy" || signal === "strong_buy") {
    if (!isBullTrend(trendLabel) && trendLabel !== "sideways") {
      return { valid: false, reason: `signal=${signal} contradicts trend=${trendLabel}` };
    }
  }
  if (signal === "sell" || signal === "strong_sell") {
    if (!isBearTrend(trendLabel) && trendLabel !== "sideways") {
      return { valid: false, reason: `signal=${signal} contradicts trend=${trendLabel}` };
    }
  }

  // 2. Signal vs Position
  if ((signal === "buy" || signal === "strong_buy") && position !== "long") {
    return { valid: false, reason: `signal=${signal} but position=${position}` };
  }
  if ((signal === "sell" || signal === "strong_sell") && position !== "short") {
    return { valid: false, reason: `signal=${signal} but position=${position}` };
  }

  // 3. Score vs Signal
  if (overallScore >= 60 && (signal === "sell" || signal === "strong_sell")) {
    return { valid: false, reason: `score=${overallScore} but signal=${signal}` };
  }
  if (overallScore <= 40 && (signal === "buy" || signal === "strong_buy")) {
    return { valid: false, reason: `score=${overallScore} but signal=${signal}` };
  }

  // 4. Opportunity vs Signal (strict rules)
  if (signal === "strong_sell" || signal === "sell") {
    if (recommendation !== "skip") {
      return { valid: false, reason: `signal=${signal} must map to opportunity=skip, got ${recommendation}` };
    }
  }

  if (signal === "neutral" && recommendation === "ready") {
    return { valid: false, reason: `neutral signal cannot produce ready opportunity` };
  }

  // 5. High risk cannot be Ready
  if (riskLevel === "high" && recommendation === "ready") {
    return { valid: false, reason: `high risk cannot produce ready opportunity` };
  }

  return { valid: true, reason: null };
}

function resolveContradiction(
  base: CoinAnalysis,
): CoinAnalysis {
  let fixed = { ...base };
  const { signal, trendLabel, position } = base;

  // If signal contradicts trend, force signal to neutral
  const buySig = signal === "buy" || signal === "strong_buy";
  const sellSig = signal === "sell" || signal === "strong_sell";
  const bullTr = isBullTrend(trendLabel);
  const bearTr = isBearTrend(trendLabel);

  if ((buySig && bearTr) || (sellSig && bullTr)) {
    fixed.signal = "neutral";
  }

  // If position is long but signal is sell → force position neutral
  // (already handled by signal fix above, but be safe)
  if (fixed.position === "long" && (fixed.signal === "sell" || fixed.signal === "strong_sell")) {
    fixed.position = "neutral";
    fixed.overallScore = Math.max(40, Math.min(60, fixed.overallScore));
  }
  if (fixed.position === "short" && (fixed.signal === "buy" || fixed.signal === "strong_buy")) {
    fixed.position = "neutral";
    fixed.overallScore = Math.max(40, Math.min(60, fixed.overallScore));
  }

  return fixed;
}

// ── main entry ───────────────────────────────────────────

export function analyzeCoin(
  marketData: MarketData,
  indicatorsOverride?: TechnicalIndicators,
): CoinAnalysis {
  const indicators = indicatorsOverride ?? generateTechnicalIndicators(marketData);

  const volumeScore = calculateVolumeScore(marketData.volume24h, marketData.marketCap);
  const trendScore = calculateTrendScore(marketData.priceChangePercent24h, indicators, marketData);
  const sentimentScore = calculateSentimentScore(MOCK_NEWS, marketData.id);
  const technicalScore = calculateTechnicalScore(indicators);
  const momentumScore = calculateMomentumScore(indicators);

  const { position, overallScore } = determinePosition(trendScore, volumeScore, sentimentScore, technicalScore);
  const trendLabel = computeTrendLabel(indicators);
  const trendAnalysis = generateTrendAnalysis(marketData.priceChangePercent24h, indicators);

  const coinNews = MOCK_NEWS.filter(n => n.relatedCoins.includes(marketData.id));
  const sentiment: SentimentData = {
    overall: sentimentScore > 60 ? "positive" : sentimentScore < 40 ? "negative" : "neutral",
    score: sentimentScore,
    twitterMentions: Math.floor(Math.random() * 50000) + 5000,
    positiveRatio: sentimentScore / 100,
    newsCount: coinNews.length,
    recentNews: coinNews,
  };

  const riskScore = computeRiskScore({ position, overallScore, trendLabel, technicalIndicators: indicators });
  const riskReward = computeRiskReward(marketData.currentPrice, indicators.supportLevels, indicators.resistanceLevels, position, indicators.atr);
  const signal = computeSignal(position, overallScore, trendLabel, indicators.macd.histogram, indicators.adx);
  const confidence = computeConfidence(volumeScore, trendScore, technicalScore, sentimentScore, overallScore, position);
  const tradeQuality = computeTradeQuality(position, trendLabel, technicalScore, volumeScore, overallScore, indicators.adx);
  const riskLevel = computeRiskLevel(riskScore);

  // ── Trade Setup (from indicator-engine) ──────────────────────────────
  function mapEngineRiskLevel(r: RiskLevel): "very_low" | "low" | "medium" | "high" | "extreme" {
    if (r === "low") return "low";
    if (r === "high") return "high";
    return "medium";
  }

  const trendDir = position === "long" ? "bullish" as const : position === "short" ? "bearish" as const : "neutral" as const;
  const rawTradeSetup = generateTradeSetup({
    currentPrice: marketData.currentPrice,
    trendDirection: trendDir,
    trendStrength: trendStrength(indicators.adx),
    supportLevels: indicators.supportLevels,
    resistanceLevels: indicators.resistanceLevels,
    atr: indicators.atr,
    adx: indicators.adx,
    ema20: indicators.ema21,
    ema50: indicators.ema50,
    ema200: indicators.ema200,
    volatility: { value: 0, annualized: 0, label: "low" },
    riskLevel: mapEngineRiskLevel(riskLevel),
    overallScore,
    signal,
    accountBalance: 10_000,
  });

  const tradeSetup: TradeSetupData = {
    hasTrade: rawTradeSetup.hasTrade,
    reason: rawTradeSetup.validation.reason,
    direction: rawTradeSetup.direction,
    entry: rawTradeSetup.entry,
    stopLoss: rawTradeSetup.stopLoss,
    risk: rawTradeSetup.risk,
    takeProfit: rawTradeSetup.takeProfit,
    riskReward: rawTradeSetup.riskReward,
    expectedProfit: rawTradeSetup.expectedProfit,
    tradeQuality: rawTradeSetup.tradeQuality,
  };

  let base: CoinAnalysis = {
    coinId: marketData.id,
    position,
    overallScore,
    volumeScore,
    trendScore,
    momentumScore,
    sentimentScore,
    technicalScore,
    riskScore,
    marketData,
    technicalIndicators: indicators,
    trendAnalysis,
    sentiment,
    lastUpdated: new Date().toISOString(),
    signal,
    confidence,
    tradeQuality,
    riskLevel,
    riskReward,
    trendLabel,
    status: "no_trade" as TradeStatus,
    recommendation: "skip" as const,
    recommendationReasonCode: "SKIP_INVALID_SETUP" as const,
    recommendationReason: "",
    recommendationColor: "#ef4444",
    recommendationPriority: 0,
    tradeSetup,
  };

  // Resolve any internal contradictions
  const check = validateInternalConsistency(base);
  if (!check.valid) {
    base = resolveContradiction(base);
  }

  // Generate recommendation (opportunity)
  const rec = generateRecommendation(base);

  const final: CoinAnalysis = {
    ...base,
    recommendation: rec.recommendation,
    recommendationReasonCode: rec.reasonCode,
    recommendationReason: rec.reason,
    recommendationColor: rec.color,
    recommendationPriority: rec.priority,
  };

  // Final validation — if still inconsistent after recalc, force safe defaults
  const finalCheck = validateInternalConsistency(final);
  if (!finalCheck.valid) {
    final.signal = "neutral";
    final.recommendation = "skip";
    final.recommendationReasonCode = "SKIP_WEAK_TREND";
    final.recommendationReason = "Inconsistent analysis — manual review advised.";
    final.recommendationColor = "#ef4444";
    final.recommendationPriority = 0;
  }

  return final;
}

export function analyzeAllCoins(
  marketDataList: MarketData[],
  indicatorsMap?: Record<string, TechnicalIndicators>,
): CoinAnalysis[] {
  return marketDataList.map((md) => analyzeCoin(md, indicatorsMap?.[md.id]));
}
