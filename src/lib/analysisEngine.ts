import { MarketData, TechnicalIndicators, TrendAnalysis, SentimentData, NewsItem, CoinAnalysis, PositionType, SignalType, RiskLevel, TrendLabel, TradeStatus } from "./types";
import { generateTechnicalIndicators, MOCK_NEWS } from "./mockData";
import { generateRecommendation } from "./recommendationEngine";

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
  const ema20 = ti.ema20;
  const ema50 = ti.ema50;
  const ema200 = ti.ema200;
  const adx = ti.adx;
  const macdHist = ti.macd.histogram;
  const rsi = ti.rsi;

  const emaBullish = ema20 > ema50 && ema50 > ema200;
  const emaBearish = ema20 < ema50 && ema50 < ema200;
  const emaMixed = !emaBullish && !emaBearish;

  let shortTerm: "bullish" | "bearish" | "neutral";
  const strongTrend = adx >= 25;
  const weakTrend = adx < 20;

  if (emaBullish && strongTrend && macdHist > 0) shortTerm = "bullish";
  else if (emaBullish && adx >= 20) shortTerm = "bullish";
  else if (emaMixed && strongTrend && macdHist > 0) shortTerm = "bullish";
  else if (emaBearish && strongTrend && macdHist < 0) shortTerm = "bearish";
  else if (emaBearish && adx >= 20) shortTerm = "bearish";
  else if (weakTrend && emaMixed) shortTerm = "neutral";
  else if (emaBullish) shortTerm = "bullish";
  else if (emaBearish) shortTerm = "bearish";
  else shortTerm = "neutral";

  const ema50Above200 = ema50 > ema200;
  let mediumTerm: "bullish" | "bearish" | "neutral";
  if (ema50Above200 && shortTerm !== "bearish") mediumTerm = "bullish";
  else if (!ema50Above200 && shortTerm !== "bullish") mediumTerm = "bearish";
  else mediumTerm = "neutral";

  const longTermChange = priceChangePercent;
  let longTerm: "bullish" | "bearish" | "neutral";
  if (longTermChange > 5 && ema50 > ema200) longTerm = "bullish";
  else if (longTermChange < -5 && ema50 < ema200) longTerm = "bearish";
  else longTerm = "neutral";

  let score = 50;
  if (emaBullish) score += 20;
  if (shortTerm === "bullish") score += 10;
  if (macdHist > 0) score += 8;
  if (adx >= 25) score += 7;
  if (rsi < 70 && rsi > 40) score += 5;
  if (emaBearish) score -= 20;
  if (shortTerm === "bearish") score -= 10;
  if (macdHist < 0) score -= 8;
  if (adx < 20) score -= 5;
  score = cap(score);

  return { shortTerm, mediumTerm, longTerm, score };
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

  let base: CoinAnalysis = {
    coinId: marketData.id,
    position,
    overallScore,
    volumeScore,
    trendScore,
    sentimentScore,
    technicalScore,
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
