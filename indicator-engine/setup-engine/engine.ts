// ─── Crypto Sense Setup Engine ──────────────────────────────────────────
// Single deterministic engine. Only place that decides if coin has valid setup.
// No AI. No random. Same input → same output always.
// All modules consume this output. No component makes its own decision.

// ─── Types ────────────────────────────────────────────────────────────────

export type Position = "long" | "short" | "neutral";
export type Signal = "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";
export type TrendLabel = "strong_bullish" | "bullish" | "sideways" | "bearish" | "strong_bearish";
export type RiskLevel = "low" | "medium" | "high";
export type Recommendation = "ready" | "wait" | "skip";
export type ReasonCode =
  | "READY"
  | "WAIT_PULLBACK"
  | "WAIT_BREAKOUT"
  | "WAIT_CONFIRMATION"
  | "WAIT_VOLUME"
  | "SKIP_HIGH_RISK"
  | "SKIP_WEAK_TREND"
  | "SKIP_LOW_RR"
  | "SKIP_INVALID_SETUP"
  | "UNAVAILABLE";

// ─── Stage 0 types ─────────────────────────────────────────────────────────

export type MarketDataStatus = "VALID" | "UNAVAILABLE";

export interface LastClosedCandle {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly time: string;
}

export interface Stage0ValidResult {
  readonly status: "VALID";
  readonly coin: string;
  readonly timeframe: string;
  readonly lastClosedCandle: LastClosedCandle;
  readonly dataTimestamp: number;
}

export interface Stage0InvalidResult {
  readonly status: "UNAVAILABLE";
  readonly coin: string;
  readonly timeframe: string;
  readonly reason: string;
  readonly timestamp: string;
}

export type Stage0Result = Stage0ValidResult | Stage0InvalidResult;

// ─── Stage 1 types ─────────────────────────────────────────────────────────

export type Tradeability = "YES" | "NO";

export interface Stage1Result {
  readonly tradeable: Tradeability;
  readonly reason: string | null;
}

// ─── Stage 2 types ─────────────────────────────────────────────────────────

export type MarketDirection = "long" | "short" | "unknown";

export interface Stage2Result {
  readonly direction: MarketDirection;
  readonly reason: string | null;
}

// ─── Stage 3 types ─────────────────────────────────────────────────────────

export type SetupQuality = "WEAK" | "NORMAL" | "STRONG" | "EXCELLENT";

export interface Stage3Result {
  readonly quality: SetupQuality;
  readonly reason: string | null;
}

// ─── Stage 4 types ─────────────────────────────────────────────────────────

export type FinalStatus = "NO_TRADE" | "WATCH" | "READY_LONG" | "READY_SHORT";

export interface Stage4Result {
  readonly finalStatus: FinalStatus;
  readonly reason: string | null;
}

export interface TpLevels {
  readonly tp1: number;
  readonly tp2: number;
  readonly tp3: number;
}

export interface TradeSetupData {
  readonly hasTrade: boolean;
  readonly reason: string | null;
  readonly direction: "long" | "short" | null;
  readonly entry: number;
  readonly stopLoss: number;
  readonly risk: number;
  readonly takeProfit: TpLevels;
  readonly riskReward: TpLevels;
  readonly expectedProfit: TpLevels;
  readonly tradeQuality: number;
}

export interface TimeframeTrend {
  trend: "bullish" | "bearish" | "neutral";
  strength: "strong" | "moderate" | "weak";
  confidence: number;
}

export interface TrendAnalysis {
  "15m": TimeframeTrend;
  "1h": TimeframeTrend;
  "4h": TimeframeTrend;
  "1d": TimeframeTrend;
  score: number;
}

/** Input for the setup engine — raw market data + pre-computed indicators. */
export interface SetupInput {
  // Market state
  currentPrice: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  // Technical indicators
  rsi: number;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  ema9: number;
  ema20: number;
  ema21: number;
  ema50: number;
  ema200: number;
  adx: number;
  atr: number;
  supportLevels: readonly number[];
  resistanceLevels: readonly number[];
  // ─── Stage 2: Direction data ──────────────────────────────────────────
  /** Positive Directional Indicator (DMI+). */
  plusDI?: number;
  /** Negative Directional Indicator (DMI-). */
  minusDI?: number;
  // ─── Stage 0: Market Data Validation ──────────────────────────────────
  /** Unique coin/symbol identifier. */
  coin?: string;
  /** Candle timeframe (e.g. "15m", "1h", "4h", "1d"). */
  timeframe?: string;
  /** Unix ms timestamp of last closed candle. */
  lastCandleTimestamp?: number;
  /** Close price of last closed candle. */
  lastCandleClose?: number;
  /** High price of last closed candle. */
  lastCandleHigh?: number;
  /** Low price of last closed candle. */
  lastCandleLow?: number;
  /** Open price of last closed candle. */
  lastCandleOpen?: number;
  /** Volume of last closed candle. */
  lastCandleVolume?: number;
  /** Total candles used for indicator calculation. */
  candleCount?: number;
  /** When the data was fetched (unix ms). */
  dataTimestamp?: number;
}

/** Output — one complete evaluation. Every decision already made. */
export interface SetupResult {
  // Stage 0: Market data validation
  marketDataStatus: MarketDataStatus;
  marketDataReason: string | null;
  // Stage 1: Market tradeability
  tradeable: Tradeability;
  tradeabilityReason: string | null;
  // Stage 2: Market direction
  marketDirection: MarketDirection;
  marketDirectionReason: string | null;
  // Stage 3: Setup quality
  setupQuality: SetupQuality;
  setupQualityReason: string | null;
  // Stage 4: Final status
  finalStatus: FinalStatus;
  // Scores
  overallScore: number;
  volumeScore: number;
  trendScore: number;
  technicalScore: number;
  momentumScore: number;
  // Position & signal
  position: Position;
  signal: Signal;
  trendLabel: TrendLabel;
  trendAnalysis: TrendAnalysis;
  // Risk
  riskScore: number;
  riskLevel: RiskLevel;
  // Quality
  confidence: number;
  tradeQuality: number;
  // Risk / reward string (human-readable)
  riskRewardString: string | null;
  // Trade setup
  tradeSetup: TradeSetupData;
  // Recommendation
  recommendation: Recommendation;
  reasonCode: ReasonCode;
  reason: string;
  color: string;
  priority: number;
}

// ─── Constants ────────────────────────────────────────────────────────────

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const BASE = 50;

// Scoring weights
const TREND_W = 0.30;
const VOLUME_W = 0.20;
const TECHNICAL_W = 0.30;
const MOMENTUM_W = 0.20;

// Thresholds
const LONG_MIN = 60;
const SHORT_MAX = 40;
const ADX_STRONG = 30;
const ADX_TRENDING = 25;
const ADX_MODERATE = 20;
const ADX_MIN = 25;
const SR_MIN = 1;

// Setup thresholds
const STOP_ATR_MULT = 1.5;
const TP1_RISK_MULT = 2;
const TP2_RISK_MULT = 3;
const TP3_RISK_MULT = 5;

// Recommendation thresholds
const QUALITY_MIN = 60;
const QUALITY_STRONG_MIN = 70;
const CONF_MIN = 60;
const CONF_STRONG_MIN = 70;
const RR_MIN = 1.3;
const RR_STRONG_MIN = 1.5;

// ─── Stage 0 constants ─────────────────────────────────────────────────────

const SUPPORTED_TIMEFRAMES: readonly string[] = ["15m", "1h", "4h", "1d"];

/** Maximum allowed age for candle data per timeframe (ms). */
const TIMEFRAME_MAX_AGE_MS: Record<string, number> = {
  "15m": 30 * 60 * 1000,   // 30 min
  "1h":  3 * 60 * 60 * 1000,  // 3 h
  "4h":  8 * 60 * 60 * 1000,  // 8 h
  "1d":  48 * 60 * 60 * 1000, // 48 h
};

// ─── Stage 1 constants ─────────────────────────────────────────────────────

/** Minimum volume/market-cap ratio for liquidity. */
const MIN_VOL_MCAP_RATIO = 0.005;

/** Minimum absolute 24h price change % to show movement. */
const MIN_PRICE_MOVE_PCT = 0.1;

/** Minimum ATR % of price for healthy volatility. */
const MIN_ATR_PCT = 0.1;

/** Maximum ATR % of price before volatility is too extreme. */
const MAX_ATR_PCT = 8;

/** Minimum candle body % of price to show intra-candle conviction. */
const MIN_CANDLE_BODY_PCT = 0.05;

/** Failures threshold — if this many checks fail, market is not tradeable. */
const TRADEABILITY_FAIL_LIMIT = 2;

// ─── Stage 2 constants ─────────────────────────────────────────────────────

/** Minimum ADX to consider a directional trend reliable. */
const DIR_ADX_MIN = 20;

/** Score contribution for each directional signal. */
const DIR_SIGNAL_WEIGHT = 1;

/** If signal score exceeds this in one direction, direction is confirmed. */
const DIR_CONFIRM_THRESHOLD = 4;

/** If signal score exceeds this in one direction over the other, direction is likely. */
const DIR_LEAD_THRESHOLD = 2;

// ─── Stage 3 constants ─────────────────────────────────────────────────────

/** Volume/mcap ratio above which volume confirms quality. */
const QUAL_VOL_RATIO_HIGH = 0.15;
const QUAL_VOL_RATIO_MED = 0.08;

/** ADX thresholds for quality tiers. */
const QUAL_ADX_STRONG = 30;
const QUAL_ADX_MODERATE = 22;

/** RSI confirmation zones. */
const QUAL_RSI_BULL_MIN = 45;
const QUAL_RSI_BULL_MAX = 75;
const QUAL_RSI_BEAR_MIN = 25;
const QUAL_RSI_BEAR_MAX = 55;

/** S/R distance % thresholds. */
const QUAL_SR_CLOSE = 0.5;   // <0.5% → close to S/R (tight setup)
const QUAL_SR_GOOD = 1.5;    // <1.5% → reasonable distance

/** Minimum R:R ratio for quality. */
const QUAL_RR_MIN = 1.5;
const QUAL_RR_STRONG = 2.5;

/** Candle body to range ratio for strong candle. */
const QUAL_BODY_RANGE_MIN = 0.5;
const QUAL_BODY_RANGE_MED = 0.3;

/** Volume spike multiplier (vs average candle vol). */
const QUAL_VOL_SPIKE = 1.5;

// ─── Stage 4 constants ─────────────────────────────────────────────────────

// No thresholds needed — Stage 4 is a pure decision table.
// (Values only defined for readability/consistency.)

// ─── Helpers ──────────────────────────────────────────────────────────────

function cap(v: number, min = MIN_SCORE, max = MAX_SCORE): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function isBullTrend(tl: TrendLabel): boolean {
  return tl === "bullish" || tl === "strong_bullish";
}
function isBearTrend(tl: TrendLabel): boolean {
  return tl === "bearish" || tl === "strong_bearish";
}
function isBuySignal(s: Signal): boolean {
  return s === "buy" || s === "strong_buy";
}
function isSellSignal(s: Signal): boolean {
  return s === "sell" || s === "strong_sell";
}

// ─── Scoring functions (all deterministic) ────────────────────────────────

function calcVolumeScore(volume24h: number, marketCap: number): number {
  if (!marketCap || marketCap <= 0) return 25;
  const ratio = volume24h / marketCap;
  if (ratio > 0.5) return 95;
  if (ratio > 0.3) return 85;
  if (ratio > 0.2) return 75;
  if (ratio > 0.1) return 60;
  if (ratio > 0.05) return 45;
  if (ratio > 0.02) return 35;
  return 25;
}

function calcTrendScore(
  priceChange: number,
  rsi: number,
  macdHistogram: number,
  ema9: number,
  ema21: number,
  ema50: number,
  ema200: number,
  volume24h: number,
  marketCap: number,
): number {
  let score = BASE;
  score += priceChange * 2;

  if (rsi < 30) score += 20;
  else if (rsi < 40) score += 10;
  else if (rsi > 70) score -= 20;
  else if (rsi > 60) score -= 10;

  if (macdHistogram > 0) score += 10;
  else score -= 10;

  if (ema9 > ema21) score += 15;
  else score -= 15;

  if (ema21 > ema50) score += 10;
  else score -= 10;

  if (ema50 > ema200) score += 8;
  else if (ema50 < ema200) score -= 8;

  const bullishAlign = ema9 > ema21 && ema21 > ema50;
  const bearishAlign = ema9 < ema21 && ema21 < ema50;
  if (bullishAlign) score += 12;
  if (bearishAlign) score -= 12;

  const volMcapRatio = marketCap > 0 ? volume24h / marketCap : 0;
  if (priceChange > 0 && volMcapRatio > 0.1) score += 5;
  else if (priceChange < 0 && volMcapRatio > 0.1) score -= 5;

  return cap(score);
}

function calcTechnicalScore(rsi: number, macdHistogram: number, ema9: number, ema21: number, ema50: number): number {
  let score = BASE;

  if (rsi <= 30) score = 80;
  else if (rsi >= 70) score = 20;
  else if (rsi < 50) score = BASE + (BASE - rsi) * 1.5;
  else score = BASE - (rsi - BASE) * 1.5;

  if (macdHistogram > 0) {
    score += 15 * Math.min(Math.abs(macdHistogram) / 2, 1);
  } else {
    score -= 15 * Math.min(Math.abs(macdHistogram) / 2, 1);
  }

  const bullishAlign = ema9 > ema21 && ema21 > ema50;
  const bearishAlign = ema9 < ema21 && ema21 < ema50;
  if (bullishAlign) score += 15;
  if (bearishAlign) score -= 15;

  return cap(score);
}

function calcMomentumScore(rsi: number, macdValue: number, macdSignal: number, macdHistogram: number, adx: number): number {
  let score = BASE;

  if (macdHistogram > 0) {
    score += 20 * Math.min(Math.abs(macdHistogram) / 2, 1);
  } else {
    score -= 20 * Math.min(Math.abs(macdHistogram) / 2, 1);
  }

  if (adx >= ADX_STRONG) score += 15;
  else if (adx >= ADX_MODERATE) score += 8;
  else score -= 5;

  if (rsi > 80) score -= 10;
  else if (rsi < 20) score -= 10;

  if (macdValue > macdSignal) score += 5;
  else score -= 5;

  return cap(score);
}

function determinePosition(
  trendScore: number,
  volumeScore: number,
  technicalScore: number,
  momentumScore: number,
): { position: Position; overallScore: number } {
  const overallScore = cap(
    trendScore * TREND_W + volumeScore * VOLUME_W + technicalScore * TECHNICAL_W + momentumScore * MOMENTUM_W,
  );

  let position: Position;
  if (overallScore >= LONG_MIN) position = "long";
  else if (overallScore <= SHORT_MAX) position = "short";
  else position = "neutral";

  return { position, overallScore };
}

function computeTrendLabel(
  ema20: number, ema50: number, ema200: number,
  adx: number, macdHistogram: number,
): TrendLabel {
  const emaBullish = ema20 > ema50 && ema50 > ema200;
  const emaBearish = ema20 < ema50 && ema50 < ema200;
  const emaMixed = !emaBullish && !emaBearish;
  const momentumUp = macdHistogram > 0;
  const momentumDown = macdHistogram < 0;
  const trendUp = adx >= ADX_MODERATE && momentumUp;
  const trendDown = adx >= ADX_MODERATE && momentumDown;

  if (emaBullish && adx >= ADX_MIN && macdHistogram > 0) return "strong_bullish";
  if (emaBearish && adx >= ADX_MIN && macdHistogram < 0) return "strong_bearish";
  if (emaBullish && adx >= ADX_MODERATE) return "bullish";
  if (emaBearish && adx >= ADX_MODERATE) return "bearish";
  if (emaMixed && trendUp && adx >= ADX_STRONG) return "bullish";
  if (emaMixed && trendDown && adx >= ADX_STRONG) return "bearish";
  if (emaBullish && adx < ADX_MODERATE) return "sideways";
  if (emaBearish && adx < ADX_MODERATE) return "sideways";

  return "sideways";
}

function computeSignal(
  position: Position,
  overallScore: number,
  trendLabel: TrendLabel,
  macdHistogram: number,
  adx: number,
  ema9: number, ema21: number, ema50: number,
): Signal {
  const bullTrend = isBullTrend(trendLabel);
  const bearTrend = isBearTrend(trendLabel);

  // EMA alignment guard
  const emaBull = ema9 > ema21 && ema21 > ema50;
  const emaBear = ema9 < ema21 && ema21 < ema50;
  const emaAligned = (position === "long" && emaBull) || (position === "short" && emaBear);
  if (!emaAligned && position !== "neutral") {
    if (adx < ADX_STRONG) return "neutral";
  }

  // Contradiction guards
  if (position === "long" && bearTrend) return "neutral";
  if (position === "short" && bullTrend) return "neutral";
  if (position === "neutral") return "neutral";

  if (position === "long") {
    if (overallScore >= 80 && bullTrend && macdHistogram > 0 && adx >= ADX_MIN) return "strong_buy";
    return "buy";
  }

  if (position === "short") {
    if (overallScore <= 20 && bearTrend && macdHistogram < 0 && adx >= ADX_MIN) return "strong_sell";
    return "sell";
  }

  return "neutral";
}

function computeConfidence(
  volumeScore: number,
  trendScore: number,
  technicalScore: number,
  overallScore: number,
  position: Position,
): number {
  const raw = volumeScore * 0.20 + trendScore * 0.40 + technicalScore * 0.40;

  let bonus = 0;
  if (position === "long") {
    if (overallScore >= 75) bonus = 15;
    else if (overallScore >= LONG_MIN) bonus = 10;
  } else if (position === "short") {
    if (overallScore <= 25) bonus = 15;
    else if (overallScore <= SHORT_MAX) bonus = 10;
  } else {
    if (overallScore >= 45 && overallScore <= 55) bonus = 10;
  }

  return cap(raw + bonus);
}

function computeRiskScore(
  position: Position,
  overallScore: number,
  trendLabel: TrendLabel,
  rsi: number,
): number {
  let score = 0;

  const trendMatch =
    (position === "long" && isBullTrend(trendLabel)) ||
    (position === "short" && isBearTrend(trendLabel));
  if (trendMatch) score += 30;
  else if (trendLabel === "sideways") score += 15;

  score += (overallScore / 100) * 25;

  if (position === "long") {
    if (rsi < 30) score += 25;
    else if (rsi < 50) score += 20;
    else if (rsi < 70) score += 10;
  } else if (position === "short") {
    if (rsi > 70) score += 25;
    else if (rsi > 50) score += 20;
    else if (rsi > 30) score += 10;
  } else {
    score += 10;
  }

  return cap(score);
}

function computeRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 70) return "low";
  if (riskScore >= 40) return "medium";
  return "high";
}

function computeTradeQuality(
  position: Position,
  trendLabel: TrendLabel,
  technicalScore: number,
  volumeScore: number,
  overallScore: number,
  adx: number,
): number {
  let q = technicalScore * 0.45 + volumeScore * 0.30;

  const trendAlign =
    (position === "long" && isBullTrend(trendLabel)) ||
    (position === "short" && isBearTrend(trendLabel));
  if (trendAlign) q += 15;

  if (position === "long" && overallScore >= 65) q += 10;
  if (position === "short" && overallScore <= 35) q += 10;

  if (adx >= ADX_MIN) q += 10;
  else if (adx >= ADX_MODERATE) q += 5;

  return cap(q);
}

function computeRiskRewardString(
  price: number,
  supportLevels: readonly number[],
  resistanceLevels: readonly number[],
  position: Position,
  atr: number,
): string | null {
  if (position === "neutral") return null;

  const nearestSupport = supportLevels.length > 0
    ? Math.max(...supportLevels.filter(s => s < price))
    : null;
  const nearestResistance = resistanceLevels.length > 0
    ? Math.min(...resistanceLevels.filter(r => r > price))
    : null;

  if (nearestSupport && nearestResistance) {
    const minStop = atr > 0 ? atr * 1.5 : 0;
    const minTarget = atr > 0 ? atr * 3 : 0;
    const risk = position === "long"
      ? Math.max(price - nearestSupport, minStop)
      : Math.max(nearestResistance - price, minStop);
    const reward = position === "long"
      ? Math.max(nearestResistance - price, minTarget)
      : Math.max(price - nearestSupport, minTarget);
    if (risk <= 0) return null;
    const ratio = reward / risk;
    if (ratio >= 3) return "1:3";
    if (ratio >= 2.5) return "1:2.5";
    if (ratio >= 2) return "1:2";
    return `1:${ratio.toFixed(1)}`;
  }

  if (atr > 0 && price > 0) {
    const stopDist = atr * 1.5;
    const takeDist = atr * 3;
    if (stopDist < price && takeDist < price * 10) {
      return "1:2";
    }
  }

  return null;
}

// ─── Trade Setup ──────────────────────────────────────────────────────────
// Computes entry, stop-loss, take-profit levels from S/R levels + ATR.

function nearestBelow(levels: readonly number[], price: number): number | null {
  const below = levels.filter(l => l < price);
  return below.length > 0 ? Math.max(...below) : null;
}

function nearestAbove(levels: readonly number[], price: number): number | null {
  const above = levels.filter(l => l > price);
  return above.length > 0 ? Math.min(...above) : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcEntry(direction: "long" | "short", price: number, levels: readonly number[], atr: number): number {
  const buffer = atr * 0.5;
  if (direction === "long") {
    const support = nearestBelow(levels, price);
    if (support !== null) return round2(Math.min(price, support + buffer));
    return round2(price);
  }
  const resistance = nearestAbove(levels, price);
  if (resistance !== null) return round2(Math.max(price, resistance - buffer));
  return round2(price);
}

function calcStopLoss(direction: "long" | "short", entry: number, levels: readonly number[], atr: number): number {
  const atrStop = atr * STOP_ATR_MULT;
  if (direction === "long") {
    const atrBased = entry - atrStop;
    const support = nearestBelow(levels, entry);
    if (support !== null) {
      const supportBased = support * 0.995;
      return round2(Math.max(atrBased, supportBased));
    }
    return round2(Math.max(atrBased, 0));
  }
  const atrBased = entry + atrStop;
  const resistance = nearestAbove(levels, entry);
  if (resistance !== null) {
    const resistanceBased = resistance * 1.005;
    return round2(Math.min(atrBased, resistanceBased));
  }
  return round2(atrBased);
}

function calcTakeProfit(direction: "long" | "short", entry: number, risk: number): TpLevels {
  if (risk <= 0) return { tp1: entry, tp2: entry, tp3: entry };
  if (direction === "long") {
    return {
      tp1: round2(entry + risk * TP1_RISK_MULT),
      tp2: round2(entry + risk * TP2_RISK_MULT),
      tp3: round2(entry + risk * TP3_RISK_MULT),
    };
  }
  return {
    tp1: round2(entry - risk * TP1_RISK_MULT),
    tp2: round2(entry - risk * TP2_RISK_MULT),
    tp3: round2(entry - risk * TP3_RISK_MULT),
  };
}

function calcExpectedProfit(direction: "long" | "short", entry: number, tp: TpLevels): TpLevels {
  if (direction === "long") {
    return { tp1: round2(tp.tp1 - entry), tp2: round2(tp.tp2 - entry), tp3: round2(tp.tp3 - entry) };
  }
  return { tp1: round2(entry - tp.tp1), tp2: round2(entry - tp.tp2), tp3: round2(entry - tp.tp3) };
}

function calcRRRatios(entry: number, stopLoss: number, tp: TpLevels): TpLevels {
  const risk = Math.abs(entry - stopLoss);
  if (risk <= 0) return { tp1: 0, tp2: 0, tp3: 0 };
  return {
    tp1: round2(Math.abs(tp.tp1 - entry) / risk),
    tp2: round2(Math.abs(tp.tp2 - entry) / risk),
    tp3: round2(Math.abs(tp.tp3 - entry) / risk),
  };
}

function generateTradeSetup(
  direction: "long" | "short",
  price: number,
  levels: readonly number[],
  atr: number,
): { entry: number; stopLoss: number; risk: number; takeProfit: TpLevels } {
  const entry = calcEntry(direction, price, levels, atr);
  const stopLoss = calcStopLoss(direction, entry, levels, atr);
  const risk = round2(Math.abs(entry - stopLoss));
  const takeProfit = calcTakeProfit(direction, entry, risk);
  return { entry, stopLoss, risk, takeProfit };
}

// ─── Trend Analysis (multi-timeframe) ─────────────────────────────────────

function generateTrendAnalysis(
  priceChangePercent: number,
  ema9: number, ema20: number, ema50: number, ema200: number,
  adx: number, macdValue: number, macdSignal: number, macdHistogram: number,
  rsi: number,
): TrendAnalysis {
  const histAbs = Math.abs(macdHistogram);
  const ema9Above21 = ema9 > ema20;
  const ema9Below21 = ema9 < ema20;
  const macdBullish = macdValue > macdSignal;
  const macdBearish = macdValue < macdSignal;
  const strongTrend = adx >= ADX_MIN;

  function classifyTrend(bullish: boolean, bearish: boolean): "bullish" | "bearish" | "neutral" {
    if (bullish) return "bullish";
    if (bearish) return "bearish";
    return "neutral";
  }

  function classifyStrength(trend: "bullish" | "bearish" | "neutral"): "strong" | "moderate" | "weak" {
    if (trend === "neutral") return adx >= ADX_MIN ? "moderate" : "weak";
    if (adx >= ADX_STRONG && histAbs > 0.5) return "strong";
    if (adx >= ADX_MODERATE) return "moderate";
    return "weak";
  }

  function calcConfidence(trend: "bullish" | "bearish" | "neutral", emaAligned: boolean, histDir: boolean): number {
    let c = BASE;
    if (trend !== "neutral") c += 15;
    if (emaAligned) c += 12;
    if (adx >= ADX_MIN) c += 10;
    else if (adx < 15) c -= 10;
    if (histDir) c += 8;
    else c -= 5;
    if (rsi > 70 || rsi < 30) c += 5;
    return cap(c);
  }

  const t15m = classifyTrend(
    ema9Above21 && macdBullish && rsi > 40 && rsi < 70,
    ema9Below21 && macdBearish && rsi < 60 && rsi > 30,
  );
  const s15m = classifyStrength(t15m);
  const c15m = calcConfidence(t15m, ema9Above21 || ema9Below21, macdBullish || macdBearish);

  const ema21Above50 = ema20 > ema50;
  const ema21Below50 = ema20 < ema50;
  const emaAlignedBull = ema9Above21 && ema21Above50;
  const emaAlignedBear = ema9Below21 && ema21Below50;

  const t1h = classifyTrend(
    emaAlignedBull && (macdBullish || adx >= ADX_MIN),
    emaAlignedBear && (macdBearish || adx >= ADX_MIN),
  );
  const s1h = classifyStrength(t1h);
  const c1h = calcConfidence(t1h, emaAlignedBull || emaAlignedBear, macdBullish || macdBearish);

  const ema50Above200 = ema50 > ema200;
  const ema50Below200 = ema50 < ema200;

  const t4h = classifyTrend(
    ema21Above50 && ema50Above200 && strongTrend,
    ema21Below50 && ema50Below200 && strongTrend,
  );
  const s4h = classifyStrength(t4h);
  const c4h = calcConfidence(t4h, ema21Above50 || ema21Below50, macdBullish || macdBearish);

  const priceChangeBull = priceChangePercent > 3;
  const priceChangeBear = priceChangePercent < -3;

  const t1d = classifyTrend(
    ema50Above200 && priceChangeBull && strongTrend,
    ema50Below200 && priceChangeBear && strongTrend,
  );
  const s1d = classifyStrength(t1d);
  const c1d = calcConfidence(t1d, ema50Above200 || ema50Below200, macdBullish || macdBearish);

  let score = BASE;
  if (ema9Above21 && ema21Above50 && ema50Above200) score += 30;
  else if (ema9Above21 && ema21Above50) score += 20;
  else if (ema50Above200) score += 10;
  if (ema9Below21 && ema21Below50 && ema50Below200) score -= 30;
  else if (ema9Below21 && ema21Below50) score -= 20;
  else if (ema50Below200) score -= 10;
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

// ─── Setup Qualification ──────────────────────────────────────────────────
// Checks continuation/breakout pattern before allowing "ready".

function isQualifiedSetup(
  price: number,
  signal: Signal,
  macdHistogram: number,
  rsi: number,
  ema20: number,
  adx: number,
  supportLevels: readonly number[],
  resistanceLevels: readonly number[],
): boolean {
  const isLong = isBuySignal(signal);
  const isShort = isSellSignal(signal);
  if (!isLong && !isShort) return false;

  let continuation = false;
  let breakout = false;

  if (isLong) {
    continuation = macdHistogram > 0 && rsi < 65 && price > ema20 && adx >= ADX_MODERATE;
    const above = resistanceLevels.filter(r => r > price);
    if (above.length > 0) {
      const nearest = Math.min(...above);
      breakout = ((nearest - price) / price) * 100 <= 2 && adx >= ADX_MODERATE;
    }
  } else if (isShort) {
    continuation = macdHistogram < 0 && rsi > 35 && price < ema20 && adx >= ADX_MODERATE;
    const below = supportLevels.filter(s => s < price);
    if (below.length > 0) {
      const nearest = Math.max(...below);
      breakout = ((price - nearest) / price) * 100 <= 2 && adx >= ADX_MODERATE;
    }
  }

  return continuation || breakout;
}

function rrAtLeast(minRR: number, rr: string | null): boolean {
  if (!rr) return true;
  const m = rr.match(/^1:(\d+(?:\.\d+)?)/);
  if (!m) return false;
  return parseFloat(m[1]) >= minRR;
}

// ─── Recommendation Matrix ────────────────────────────────────────────────
// Translates signal + quality + confidence + risk + R:R → ready/wait/skip.

function generateRecommendation(
  position: Position,
  signal: Signal,
  overallScore: number,
  confidence: number,
  tradeQuality: number,
  riskLevel: RiskLevel,
  riskRewardString: string | null,
  price: number,
  macdHistogram: number,
  rsi: number,
  ema20: number,
  adx: number,
  supportLevels: readonly number[],
  resistanceLevels: readonly number[],
): { recommendation: Recommendation; reasonCode: ReasonCode; reason: string; color: string; priority: number } {
  const setupOk = isQualifiedSetup(price, signal, macdHistogram, rsi, ema20, adx, supportLevels, resistanceLevels);

  // ── SELL / STRONG SELL ──────────────────────────────────────
  if (isSellSignal(signal)) {
    const riskOk = riskLevel !== "high";
    const isStrong = signal === "strong_sell";
    const qualityOk = isStrong ? tradeQuality >= QUALITY_STRONG_MIN : tradeQuality >= QUALITY_MIN;
    const confOk = isStrong ? confidence >= CONF_STRONG_MIN : confidence >= CONF_MIN;
    const rrOk = rrAtLeast(isStrong ? RR_STRONG_MIN : RR_MIN, riskRewardString);

    if (riskOk && qualityOk && confOk && rrOk && setupOk) {
      return {
        recommendation: "ready", reasonCode: "READY",
        reason: `${isStrong ? "Strong s" : "S"}ell signal confirmed. Score ${overallScore} | Confidence ${confidence}% | Quality ${tradeQuality} | R:R ${riskRewardString ?? "?"}`,
        color: "#ef4444", priority: 100,
      };
    }
    if (!setupOk) return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: "No clear continuation or breakdown pattern. Waiting for better setup.", color: "#eab308", priority: 30 };
    if (!riskOk) return { recommendation: "wait", reasonCode: "SKIP_HIGH_RISK", reason: `${isStrong ? "Strong s" : "S"}ell signal but risk is high — waiting for improvement.`, color: "#eab308", priority: isStrong ? 51 : 41 };
    if (!rrOk) return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: `${isStrong ? "Strong s" : "S"}ell but R:R insufficient (${riskRewardString ?? "none"}) — waiting for better entry.`, color: "#eab308", priority: isStrong ? 52 : 42 };
    if (!qualityOk) return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: `${isStrong ? "Strong s" : "S"}ell but quality ${tradeQuality} below ${isStrong ? 70 : 60} — needs improvement.`, color: "#eab308", priority: isStrong ? 53 : 43 };
    if (!confOk) return { recommendation: "wait", reasonCode: "WAIT_VOLUME", reason: `${isStrong ? "Strong s" : "S"}ell but confidence ${confidence}% below ${isStrong ? 70 : 60} — volume confirmation needed.`, color: "#eab308", priority: isStrong ? 54 : 44 };

    return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: `${isStrong ? "Strong s" : "S"}ell signal — final checks pending.`, color: "#eab308", priority: isStrong ? 55 : 45 };
  }

  // ── NEUTRAL ──────────────────────────────────────────────────
  if (signal === "neutral") {
    if (overallScore >= BASE) {
      return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: `Neutral signal, score ${overallScore} — monitoring for direction.`, color: "#eab308", priority: 30 };
    }
    return { recommendation: "skip", reasonCode: "SKIP_WEAK_TREND", reason: `Neutral signal, weak score ${overallScore} — no trade.`, color: "#ef4444", priority: 10 };
  }

  // ── BUY / STRONG BUY ─────────────────────────────────────────
  const isStrong = signal === "strong_buy";
  const riskOk = riskLevel !== "high";
  const qualityOk = isStrong ? tradeQuality >= QUALITY_STRONG_MIN : tradeQuality >= QUALITY_MIN;
  const confOk = isStrong ? confidence >= CONF_STRONG_MIN : confidence >= CONF_MIN;
  const rrOk = rrAtLeast(isStrong ? RR_STRONG_MIN : RR_MIN, riskRewardString);

  if (riskOk && qualityOk && confOk && rrOk && setupOk) {
    return {
      recommendation: "ready", reasonCode: "READY",
      reason: `${isStrong ? "Strong b" : "B"}uy signal confirmed. Score ${overallScore} | Confidence ${confidence}% | Quality ${tradeQuality} | R:R ${riskRewardString ?? "?"}`,
      color: "#22c55e", priority: 100,
    };
  }

  if (!setupOk) return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: "No clear continuation or breakout pattern. Waiting for better setup.", color: "#eab308", priority: 30 };
  if (!riskOk) return { recommendation: "wait", reasonCode: "SKIP_HIGH_RISK", reason: `${isStrong ? "Strong b" : "B"}uy signal but risk is high — waiting for improvement.`, color: "#eab308", priority: isStrong ? 51 : 41 };
  if (!rrOk) return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: `${isStrong ? "Strong b" : "B"}uy but R:R insufficient (${riskRewardString ?? "none"}) — waiting for better entry.`, color: "#eab308", priority: isStrong ? 52 : 42 };
  if (!qualityOk) return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: `${isStrong ? "Strong b" : "B"}uy but quality ${tradeQuality} below ${isStrong ? 70 : 60} — needs improvement.`, color: "#eab308", priority: isStrong ? 53 : 43 };
  if (!confOk) return { recommendation: "wait", reasonCode: "WAIT_VOLUME", reason: `${isStrong ? "Strong b" : "B"}uy but confidence ${confidence}% below ${isStrong ? 70 : 60} — volume confirmation needed.`, color: "#eab308", priority: isStrong ? 54 : 44 };

  return { recommendation: "wait", reasonCode: "WAIT_CONFIRMATION", reason: `${isStrong ? "Strong b" : "B"}uy signal — final checks pending.`, color: "#eab308", priority: isStrong ? 55 : 45 };
}

// ─── Validation ───────────────────────────────────────────────────────────

function validateInternalConsistency(
  position: Position,
  signal: Signal,
  trendLabel: TrendLabel,
  overallScore: number,
  riskLevel: RiskLevel,
  recommendation: Recommendation,
): { valid: boolean; reason: string | null } {
  const buySig = isBuySignal(signal);
  const sellSig = isSellSignal(signal);

  if (buySig && !isBullTrend(trendLabel) && trendLabel !== "sideways") {
    return { valid: false, reason: `signal=${signal} contradicts trend=${trendLabel}` };
  }
  if (sellSig && !isBearTrend(trendLabel) && trendLabel !== "sideways") {
    return { valid: false, reason: `signal=${signal} contradicts trend=${trendLabel}` };
  }
  if (buySig && position !== "long") {
    return { valid: false, reason: `signal=${signal} but position=${position}` };
  }
  if (sellSig && position !== "short") {
    return { valid: false, reason: `signal=${signal} but position=${position}` };
  }
  if (overallScore >= LONG_MIN && sellSig) {
    return { valid: false, reason: `score=${overallScore} but signal=${signal}` };
  }
  if (overallScore <= SHORT_MAX && buySig) {
    return { valid: false, reason: `score=${overallScore} but signal=${signal}` };
  }
  if (signal === "neutral" && recommendation === "ready") {
    return { valid: false, reason: "neutral signal cannot produce ready opportunity" };
  }
  if (riskLevel === "high" && recommendation === "ready") {
    return { valid: false, reason: "high risk cannot produce ready opportunity" };
  }

  return { valid: true, reason: null };
}

function resolveContradiction(
  position: Position,
  signal: Signal,
  trendLabel: TrendLabel,
  overallScore: number,
): { position: Position; signal: Signal; overallScore: number } {
  let p = position;
  let s: Signal = signal;
  let sc = overallScore;

  const buySig = isBuySignal(signal);
  const sellSig = isSellSignal(signal);

  if ((buySig && isBearTrend(trendLabel)) || (sellSig && isBullTrend(trendLabel))) {
    s = "neutral";
  }

  if (p === "long" && (s === "sell" || s === "strong_sell")) {
    p = "neutral";
    sc = Math.max(30, Math.min(70, sc));
  }
  if (p === "short" && (s === "buy" || s === "strong_buy")) {
    p = "neutral";
    sc = Math.max(30, Math.min(70, sc));
  }
  if (p === "neutral" && (buySig || sellSig)) {
    s = "neutral";
  }

  return { position: p, signal: s, overallScore: sc };
}

// ─── Pre-conditions for trade viability ───────────────────────────────────

function validatePreConditions(
  adx: number,
  atr: number,
  supportLevels: readonly number[],
  resistanceLevels: readonly number[],
): string | null {
  const reasons: string[] = [];
  if (adx < ADX_MIN) reasons.push(`ADX (${adx.toFixed(1)}) below minimum (${ADX_MIN}) — trend too weak`);
  if (!(atr > 1e-10)) reasons.push("ATR is invalid or zero");
  const srCount = supportLevels.length + resistanceLevels.length;
  if (srCount < SR_MIN) reasons.push("No support or resistance levels detected");
  return reasons.length > 0 ? reasons.join("; ") : null;
}

// ─── Stage 1: Market Tradeability ───────────────────────────────────────────
// Determines if the market is worth trading at all. Uses latest CLOSED candle.
// Does NOT determine direction or quality. Returns YES or NO.
// If NO, pipeline stops — no further stages run.

export function determineTradeability(input: SetupInput): Stage1Result {
  const price = input.currentPrice;
  const atrPct = price > 0 ? (input.atr / price) * 100 : 0;
  const volMcapRatio = input.marketCap > 0 ? input.volume24h / input.marketCap : 0;
  const priceChangeAbs = Math.abs(input.priceChangePercent24h);

  // Candle body size — direction-neutral movement in latest closed candle
  const candleBody = (input.lastCandleClose !== undefined && input.lastCandleOpen !== undefined)
    ? Math.abs(input.lastCandleClose - input.lastCandleOpen)
    : 0;
  const candleBodyPct = price > 0 ? (candleBody / price) * 100 : 0;

  const failures: string[] = [];

  // ── 1. Liquidity ─────────────────────────────────────────────────
  // Volume relative to market cap. Low ratio = illiquid = hard to trade.
  if (volMcapRatio < MIN_VOL_MCAP_RATIO) {
    failures.push("Liquidity too low");
  }

  // ── 2. Volume activity ────────────────────────────────────────────
  // Latest closed candle must have traded volume.
  const latestVol = input.lastCandleVolume ?? input.volume24h;
  if (latestVol <= 0) {
    failures.push("No volume on latest candle");
  }

  // ── 3. Price movement ─────────────────────────────────────────────
  // Latest candle must show some price action (body or 24h change).
  if (candleBodyPct < MIN_CANDLE_BODY_PCT && priceChangeAbs < MIN_PRICE_MOVE_PCT) {
    failures.push("Price movement negligible");
  }

  // ── 4. Volatility ─────────────────────────────────────────────────
  // ATR must be in a healthy range — not dead quiet, not extremely wild.
  if (atrPct < MIN_ATR_PCT) {
    failures.push("Market too quiet");
  } else if (atrPct > MAX_ATR_PCT) {
    failures.push("Volatility too extreme");
  }

  // ── 5. Initial momentum ───────────────────────────────────────────
  // Some directional bias must exist — either in the candle or in MACD.
  const candleDirectional = input.lastCandleClose !== undefined && input.lastCandleOpen !== undefined
    && input.lastCandleClose !== input.lastCandleOpen;
  const macdActive = input.macdHistogram !== 0;
  const hasMomentum = candleDirectional || macdActive || priceChangeAbs >= 0.5;

  if (!hasMomentum) {
    failures.push("No initial momentum");
  }

  // ── Decision ──────────────────────────────────────────────────────
  if (failures.length >= TRADEABILITY_FAIL_LIMIT) {
    return { tradeable: "NO", reason: failures[0] };
  }

  return { tradeable: "YES", reason: null };
}

// ─── Stage 2: Market Direction ──────────────────────────────────────────────
// Determines LONG, SHORT, or UNKNOWN using DMI, EMA structure, MACD, S/R.
// Runs only when Stage 1 returned Tradeable = YES.
// If UNKNOWN, pipeline stops — no further stages run.

export function determineDirection(input: SetupInput): Stage2Result {
  const price = input.currentPrice;
  const emaBull = input.ema9 > input.ema20 && input.ema20 > input.ema50;
  const emaBear = input.ema9 < input.ema20 && input.ema20 < input.ema50;
  const adxStrong = input.adx >= DIR_ADX_MIN;

  // DMI crossover (requires plusDI/minusDI)
  const dmiBull = input.plusDI !== undefined && input.minusDI !== undefined && input.plusDI > input.minusDI;
  const dmiBear = input.plusDI !== undefined && input.minusDI !== undefined && input.minusDI > input.plusDI;

  // ── Score directional signals ────────────────────────────────────
  let bullScore = 0;
  let bearScore = 0;
  const reasons: string[] = [];

  // 1. EMA structure
  if (emaBull) { bullScore += 3; reasons.push("Bullish EMA alignment"); }
  else if (emaBear) { bearScore += 3; reasons.push("Bearish EMA alignment"); }

  // 2. Price vs key EMAs
  if (price > input.ema50) bullScore += 1;
  else bearScore += 1;
  if (price > input.ema20) bullScore += 1;
  else bearScore += 1;

  // 3. MACD momentum
  if (input.macdHistogram > 0) { bullScore += 2; reasons.push("MACD histogram positive"); }
  else if (input.macdHistogram < 0) { bearScore += 2; reasons.push("MACD histogram negative"); }

  if (input.macdValue > input.macdSignal) bullScore += 1;
  else bearScore += 1;

  // 4. ADX — confirms trend exists (amplifies EMA/MACD conviction)
  if (adxStrong) {
    if (emaBull || dmiBull) bullScore += 1;
    if (emaBear || dmiBear) bearScore += 1;
  }

  // 5. DMI crossover (if data available)
  if (dmiBull) { bullScore += 2; reasons.push("DMI+ above DMI-"); }
  else if (dmiBear) { bearScore += 2; reasons.push("DMI- above DMI+"); }

  // 6. Support / Resistance break
  const aboveResist = input.resistanceLevels.length > 0
    && Math.min(...input.resistanceLevels) < price;
  const belowSupport = input.supportLevels.length > 0
    && Math.max(...input.supportLevels) > price;
  if (aboveResist) { bullScore += 1; reasons.push("Price above resistance"); }
  if (belowSupport) { bearScore += 1; reasons.push("Price below support"); }

  // 7. Latest candle direction
  if (input.lastCandleClose !== undefined && input.lastCandleOpen !== undefined) {
    if (input.lastCandleClose > input.lastCandleOpen) bullScore += 1;
    else if (input.lastCandleClose < input.lastCandleOpen) bearScore += 1;
  }

  // 8. RSI bias
  const rsiMid = 50;
  if (input.rsi > rsiMid + 5) bullScore += 1;
  else if (input.rsi < rsiMid - 5) bearScore += 1;

  // ── Decision ──────────────────────────────────────────────────────
  const net = bullScore - bearScore;

  if (net >= DIR_CONFIRM_THRESHOLD && bullScore > bearScore * 1.5) {
    return { direction: "long", reason: "Direction confirmed LONG" };
  }
  if (net <= -DIR_CONFIRM_THRESHOLD && bearScore > bullScore * 1.5) {
    return { direction: "short", reason: "Direction confirmed SHORT" };
  }
  if (net >= DIR_LEAD_THRESHOLD) {
    return { direction: "long", reason: "Direction leans LONG" };
  }
  if (net <= -DIR_LEAD_THRESHOLD) {
    return { direction: "short", reason: "Direction leans SHORT" };
  }

  return { direction: "unknown", reason: "Direction cannot be confirmed — mixed signals" };
}

// ─── Stage 3: Setup Quality ─────────────────────────────────────────────────
// Evaluates setup quality: WEAK / NORMAL / STRONG / EXCELLENT.
// Runs only when Tradeable = YES AND direction != UNKNOWN.
// Each signal contributes +1 (weak), +2 (normal), +3 (strong), +4 (excellent).

export function determineSetupQuality(input: SetupInput, direction: MarketDirection): Stage3Result {
  let total = 0;
  const details: string[] = [];

  // 1. Volume confirmation ──────────────────────────────────────────
  const volRatio = input.marketCap > 0 ? input.volume24h / input.marketCap : 0;
  if (volRatio >= QUAL_VOL_RATIO_HIGH) { total += 3; details.push("Volume high"); }
  else if (volRatio >= QUAL_VOL_RATIO_MED) { total += 2; details.push("Volume moderate"); }
  else if (volRatio > 0) { total += 1; details.push("Volume low"); }
  else { total += 0; details.push("Volume zero"); }

  // 2. ADX strength ────────────────────────────────────────────────
  if (input.adx >= QUAL_ADX_STRONG) { total += 3; details.push("ADX strong"); }
  else if (input.adx >= QUAL_ADX_MODERATE) { total += 2; details.push("ADX moderate"); }
  else if (input.adx >= DIR_ADX_MIN) { total += 1; details.push("ADX weak"); }
  else { total += 0; details.push("ADX low"); }

  // 3. RSI confirmation (direction-aware) ──────────────────────────
  if (direction === "long") {
    if (input.rsi >= QUAL_RSI_BULL_MIN && input.rsi <= QUAL_RSI_BULL_MAX) { total += 3; details.push("RSI confirms long"); }
    else if (input.rsi < QUAL_RSI_BULL_MIN) { total += 1; details.push("RSI oversold"); }
    else { total += 1; details.push("RSI overbought — caution"); }
  } else {
    if (input.rsi >= QUAL_RSI_BEAR_MIN && input.rsi <= QUAL_RSI_BEAR_MAX) { total += 3; details.push("RSI confirms short"); }
    else if (input.rsi > QUAL_RSI_BEAR_MAX) { total += 1; details.push("RSI overbought"); }
    else { total += 1; details.push("RSI oversold — caution"); }
  }

  // 4. Distance to support (short) or resistance (long) ────────────
  let srDistPct = Infinity;
  if (direction === "long" && input.resistanceLevels.length > 0) {
    const nearestRes = Math.min(...input.resistanceLevels);
    srDistPct = Math.abs(nearestRes - input.currentPrice) / input.currentPrice * 100;
    if (srDistPct <= QUAL_SR_CLOSE) { total += 3; details.push("Near resistance"); }
    else if (srDistPct <= QUAL_SR_GOOD) { total += 2; details.push("Good distance to resistance"); }
    else { total += 1; details.push("Far from resistance"); }
  } else if (direction === "short" && input.supportLevels.length > 0) {
    const nearestSup = Math.max(...input.supportLevels);
    srDistPct = Math.abs(input.currentPrice - nearestSup) / input.currentPrice * 100;
    if (srDistPct <= QUAL_SR_CLOSE) { total += 3; details.push("Near support"); }
    else if (srDistPct <= QUAL_SR_GOOD) { total += 2; details.push("Good distance to support"); }
    else { total += 1; details.push("Far from support"); }
  } else {
    total += 1; details.push("No S/R levels — neutral");
  }

  // 5. Risk / reward ───────────────────────────────────────────────
  if (input.supportLevels.length > 0 && input.resistanceLevels.length > 0 && input.atr > 0) {
    const entry = input.currentPrice;
    let stopDist: number;
    let targetDist: number;
    if (direction === "long") {
      stopDist = entry - Math.max(...input.supportLevels);
      targetDist = Math.min(...input.resistanceLevels) - entry;
    } else {
      stopDist = Math.min(...input.supportLevels) - entry;
      targetDist = Math.max(...input.resistanceLevels) - entry;
      // For shorts, both dists will be negative — take abs
      stopDist = Math.abs(stopDist);
      targetDist = Math.abs(targetDist);
    }
    const rr = stopDist > 0 ? targetDist / stopDist : 0;
    if (rr >= QUAL_RR_STRONG) { total += 3; details.push("R:R strong"); }
    else if (rr >= QUAL_RR_MIN) { total += 2; details.push("R:R ok"); }
    else if (rr > 0) { total += 1; details.push("R:R poor"); }
    else { total += 0; details.push("No R:R"); }
  } else {
    total += 1; details.push("R:R not calculable");
  }

  // 6. Momentum strength (MACD) ────────────────────────────────────
  const macdAbs = Math.abs(input.macdHistogram);
  const momThreshold = 0.5; // histo value is in price units — direction-agnostic
  if (macdAbs > momThreshold * 3) { total += 3; details.push("Momentum strong"); }
  else if (macdAbs > momThreshold * 1.5) { total += 2; details.push("Momentum moderate"); }
  else if (macdAbs > 0) { total += 1; details.push("Momentum weak"); }
  else { total += 0; details.push("No momentum"); }

  // 7. Candle quality ──────────────────────────────────────────────
  const close = input.lastCandleClose;
  const open = input.lastCandleOpen;
  const high = input.lastCandleHigh;
  const low = input.lastCandleLow;
  if (close !== undefined && open !== undefined && high !== undefined && low !== undefined && high !== low) {
    const body = Math.abs(close - open);
    const range = high - low;
    const bodyRatio = body / range;
    const bullishCandle = (direction === "long" && close > open) || (direction === "short" && close < open);
    if (bodyRatio >= QUAL_BODY_RANGE_MIN && bullishCandle) { total += 4; details.push("Candle quality excellent"); }
    else if (bodyRatio >= QUAL_BODY_RANGE_MED && bullishCandle) { total += 3; details.push("Candle quality good"); }
    else if (bodyRatio >= QUAL_BODY_RANGE_MIN) { total += 2; details.push("Candle quality moderate"); }
    else if (bodyRatio >= QUAL_BODY_RANGE_MED) { total += 1; details.push("Candle quality weak"); }
    else { total += 0; details.push("Candle quality poor"); }
  } else {
    total += 1; details.push("Candle data incomplete");
  }

  // ── Decision ──────────────────────────────────────────────────────
  // Max possible total: 7 criteria × ~3 avg = ~22; max capped ~26
  if (total >= 20) {
    return { quality: "EXCELLENT", reason: details.join("; ") };
  }
  if (total >= 14) {
    return { quality: "STRONG", reason: details.join("; ") };
  }
  if (total >= 8) {
    return { quality: "NORMAL", reason: details.join("; ") };
  }
  return { quality: "WEAK", reason: details.join("; ") };
}

// ─── Stage 4: Final Status ─────────────────────────────────────────────────
// Pure decision table mapping (Tradeable, Direction, Quality) → FinalStatus.
// Exactly one final status produced — the single authoritative output.

export function determineFinalStatus(
  tradeable: Tradeability,
  direction: MarketDirection,
  quality: SetupQuality,
): Stage4Result {
  // Tradeable = NO or Direction = UNKNOWN → NO TRADE
  if (tradeable === "NO" || direction === "unknown") {
    return { finalStatus: "NO_TRADE", reason: "No tradeable setup" };
  }

  // Quality = WEAK or NORMAL → WATCH
  if (quality === "WEAK" || quality === "NORMAL") {
    return { finalStatus: "WATCH", reason: `Quality ${quality.toLowerCase()} — monitoring` };
  }

  // Quality = STRONG or EXCELLENT → READY (direction-dependent)
  if (quality === "STRONG" || quality === "EXCELLENT") {
    if (direction === "long") {
      return { finalStatus: "READY_LONG", reason: "Long setup confirmed" };
    }
    if (direction === "short") {
      return { finalStatus: "READY_SHORT", reason: "Short setup confirmed" };
    }
  }

  // Fallback (should never reach here given logic above)
  return { finalStatus: "NO_TRADE", reason: "Unexpected state — no final status" };
}

// ─── Stage 0: Market Data Validation ───────────────────────────────────────
// Verifies all required market data is valid, complete, and reliable.
// Returns VALID or UNAVAILABLE. Never silently continues with bad data.

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidTimestamp(ts: unknown): ts is number {
  return isFiniteNumber(ts) && ts > 1000000000000 && ts < 9999999999999;
}

function fmtTimestamp(ts: number): string {
  return new Date(ts).toISOString();
}

export function validateMarketData(input: SetupInput): Stage0Result {
  const coin = input.coin ?? "unknown";
  const timeframe = input.timeframe ?? "unknown";
  const failures: string[] = [];

  // ── Market Data Checks ─────────────────────────────────────────────
  // Current price exists
  if (!isFiniteNumber(input.currentPrice) || input.currentPrice <= 0) {
    failures.push("Missing candle data — currentPrice invalid or zero");
  }

  // OHLC candle data exists
  if (input.candleCount !== undefined) {
    if (!isFiniteNumber(input.candleCount) || input.candleCount < 1) {
      failures.push("Missing candle data — candleCount must be >= 1");
    }

    // Latest CLOSED candle exists
    if (input.candleCount < 2) {
      failures.push("No closed candle available — only one candle in dataset");
    }
  }

  // Candle timestamp is valid
  if (input.lastCandleTimestamp !== undefined) {
    if (!isValidTimestamp(input.lastCandleTimestamp)) {
      failures.push("Missing candle data — lastCandleTimestamp is invalid");
    }

    // Candle timeframe matches the selected timeframe
    if (timeframe !== "unknown" && input.dataTimestamp !== undefined) {
      const maxAge = TIMEFRAME_MAX_AGE_MS[timeframe];
      if (maxAge !== undefined) {
        const age = input.dataTimestamp - input.lastCandleTimestamp;
        if (age < 0) {
          failures.push("Candle timestamp is in the future");
        }
      }
    }
  }

  if (input.lastCandleClose !== undefined) {
    if (!isFiniteNumber(input.lastCandleClose) || input.lastCandleClose <= 0) {
      failures.push("Missing candle data — lastCandleClose invalid or zero");
    }
  }

  // ── Volume Data Checks ──────────────────────────────────────────────
  // Current volume exists
  if (!isFiniteNumber(input.volume24h) || input.volume24h <= 0) {
    failures.push("Invalid volume data — volume24h missing or zero");
  }

  // Historical volume data is available (candle-level volume)
  if (input.lastCandleVolume !== undefined) {
    if (!isFiniteNumber(input.lastCandleVolume) || input.lastCandleVolume < 0) {
      failures.push("Invalid volume data — lastCandleVolume invalid");
    }
  }

  // ── Indicator Data Checks ───────────────────────────────────────────
  // Required indicator inputs can be calculated (all pre-computed here)
  const indicatorFields = [
    ["RSI", input.rsi],
    ["MACD value", input.macdValue],
    ["MACD signal", input.macdSignal],
    ["MACD histogram", input.macdHistogram],
    ["EMA9", input.ema9],
    ["EMA20", input.ema20],
    ["EMA21", input.ema21],
    ["EMA50", input.ema50],
    ["EMA200", input.ema200],
    ["ADX", input.adx],
    ["ATR", input.atr],
  ] as const;

  for (const [name, val] of indicatorFields) {
    if (val === undefined || val === null) {
      failures.push(`Incomplete calculation — ${name} is undefined`);
    } else if (typeof val !== "number" || !Number.isFinite(val)) {
      failures.push(`Incomplete calculation — ${name} is NaN or invalid`);
    }
  }

  // ── Data Quality Checks ─────────────────────────────────────────────
  // Symbol exists
  if (!coin || coin === "unknown") {
    failures.push("Symbol does not exist — coin identifier missing");
  }

  // Timeframe is supported
  if (timeframe !== "unknown" && !SUPPORTED_TIMEFRAMES.includes(timeframe)) {
    failures.push(`Unsupported timeframe — "${timeframe}" is not valid`);
  }

  // Data is not stale
  if (input.dataTimestamp !== undefined && input.timeframe !== undefined) {
    if (isValidTimestamp(input.dataTimestamp)) {
      const maxAge = TIMEFRAME_MAX_AGE_MS[input.timeframe];
      if (maxAge !== undefined) {
        const age = Date.now() - input.dataTimestamp;
        if (age > maxAge) {
          failures.push(`API data unavailable — stale data (age ${Math.round(age / 1000 / 60)} min, max ${Math.round(maxAge / 1000 / 60)} min)`);
        }
      }
    } else {
      failures.push("API data unavailable — dataTimestamp is invalid");
    }
  }

  // ── Result ──────────────────────────────────────────────────────────
  if (failures.length > 0) {
    return {
      status: "UNAVAILABLE",
      coin,
      timeframe,
      reason: failures[0],
      timestamp: new Date().toISOString(),
    };
  }

  const lastClosedCandle: LastClosedCandle = {
    timestamp: input.lastCandleTimestamp ?? 0,
    open: input.lastCandleOpen ?? input.currentPrice,
    high: input.lastCandleHigh ?? input.currentPrice,
    low: input.lastCandleLow ?? input.currentPrice,
    close: input.lastCandleClose ?? input.currentPrice,
    volume: input.lastCandleVolume ?? input.volume24h,
    time: new Date(input.lastCandleTimestamp ?? Date.now()).toISOString(),
  };

  return {
    status: "VALID",
    coin,
    timeframe,
    lastClosedCandle,
    dataTimestamp: input.dataTimestamp ?? Date.now(),
  };
}

// ══════════════════════════════════════════════════════════════════════════
//  PUBLIC API — single entry point
// ══════════════════════════════════════════════════════════════════════════

export function evaluateSetup(input: SetupInput): SetupResult {
  const emptyTp: TpLevels = { tp1: 0, tp2: 0, tp3: 0 };

  function unavailableResult(reason: string, reasonCode: ReasonCode): SetupResult {
    return {
      marketDataStatus: "UNAVAILABLE",
      marketDataReason: reason,
      tradeable: "NO",
      tradeabilityReason: reason,
      marketDirection: "unknown",
      marketDirectionReason: null,
      setupQuality: "WEAK",
      setupQualityReason: null,
      finalStatus: "NO_TRADE",
      overallScore: 0, volumeScore: 0, trendScore: 0, technicalScore: 0, momentumScore: 0,
      position: "neutral", signal: "neutral", trendLabel: "sideways",
      trendAnalysis: { "15m": { trend: "neutral", strength: "weak", confidence: 0 }, "1h": { trend: "neutral", strength: "weak", confidence: 0 }, "4h": { trend: "neutral", strength: "weak", confidence: 0 }, "1d": { trend: "neutral", strength: "weak", confidence: 0 }, score: 0 },
      riskScore: 0, riskLevel: "high", confidence: 0, tradeQuality: 0, riskRewardString: null,
      tradeSetup: { hasTrade: false, reason, direction: null, entry: 0, stopLoss: 0, risk: 0, takeProfit: emptyTp, riskReward: emptyTp, expectedProfit: emptyTp, tradeQuality: 0 },
      recommendation: "skip", reasonCode, reason, color: "#6b7280", priority: 0,
    };
  }

  // ═══ Stage 0: Market Data Validation ══════════════════════════════════
  // Must pass before any analysis runs.
  const stage0 = validateMarketData(input);
  if (stage0.status === "UNAVAILABLE") {
    return unavailableResult(stage0.reason, "UNAVAILABLE");
  }

  // ═══ Stage 1: Market Tradeability ═════════════════════════════════════
  // Uses latest CLOSED candle. Returns YES or NO.
  // If NO, pipeline stops — no direction/quality/signal generation.
  const stage1 = determineTradeability(input);
  if (stage1.tradeable === "NO") {
    return {
      ...unavailableResult(stage1.reason ?? "Market not tradeable", "SKIP_WEAK_TREND"),
      marketDataStatus: "VALID",
      marketDataReason: null,
      marketDirection: "unknown",
      marketDirectionReason: "Pipeline stopped at Stage 1",
      setupQuality: "WEAK",
      setupQualityReason: null,
      finalStatus: "NO_TRADE",
    };
  }

  // ═══ Stage 2: Market Direction ═══════════════════════════════════════
  // Determines LONG / SHORT / UNKNOWN.
  // If UNKNOWN, pipeline stops — no further analysis.
  const stage2 = determineDirection(input);
  if (stage2.direction === "unknown") {
    return {
      ...unavailableResult("Stage 2: " + (stage2.reason ?? "Direction unknown"), "SKIP_WEAK_TREND"),
      marketDataStatus: "VALID",
      marketDataReason: null,
      tradeable: "YES",
      tradeabilityReason: null,
      marketDirection: "unknown",
      marketDirectionReason: stage2.reason,
      setupQuality: "WEAK",
      setupQualityReason: null,
      finalStatus: "NO_TRADE",
    };
  }

  // ═══ Stage 3: Setup Quality ═══════════════════════════════════════
  // Evaluates WEAK / NORMAL / STRONG / EXCELLENT.
  // If WEAK, pipeline stops — no further analysis.
  const stage3 = determineSetupQuality(input, stage2.direction);
  if (stage3.quality === "WEAK") {
    return {
      ...unavailableResult("Stage 3: " + (stage3.reason ?? "Setup quality too weak"), "SKIP_WEAK_TREND"),
      marketDataStatus: "VALID",
      marketDataReason: null,
      tradeable: "YES",
      tradeabilityReason: null,
      marketDirection: stage2.direction,
      marketDirectionReason: stage2.reason,
      setupQuality: "WEAK",
      setupQualityReason: stage3.reason,
      finalStatus: "WATCH",
    };
  }

  // ═══ Stage 4+: Analysis Pipeline ═════════════════════════════════════
  // 1. Scores
  const volumeScore = calcVolumeScore(input.volume24h, input.marketCap);
  const trendScore = calcTrendScore(
    input.priceChangePercent24h,
    input.rsi, input.macdHistogram,
    input.ema9, input.ema21, input.ema50, input.ema200,
    input.volume24h, input.marketCap,
  );
  const technicalScore = calcTechnicalScore(input.rsi, input.macdHistogram, input.ema9, input.ema21, input.ema50);
  const momentumScore = calcMomentumScore(input.rsi, input.macdValue, input.macdSignal, input.macdHistogram, input.adx);

  // 2. Position + overall
  let { position, overallScore } = determinePosition(trendScore, volumeScore, technicalScore, momentumScore);

  // 3. Trend
  const trendLabel = computeTrendLabel(input.ema20, input.ema50, input.ema200, input.adx, input.macdHistogram);
  const trendAnalysis = generateTrendAnalysis(
    input.priceChangePercent24h,
    input.ema9, input.ema20, input.ema50, input.ema200,
    input.adx, input.macdValue, input.macdSignal, input.macdHistogram,
    input.rsi,
  );

  // 4. Risk
  const riskScore = computeRiskScore(position, overallScore, trendLabel, input.rsi);
  const riskLevel = computeRiskLevel(riskScore);

  // 5. Risk / reward string
  const riskRewardString = computeRiskRewardString(
    input.currentPrice,
    input.supportLevels,
    input.resistanceLevels,
    position,
    input.atr,
  );

  // 6. Signal
  let signal: Signal = computeSignal(
    position, overallScore, trendLabel,
    input.macdHistogram, input.adx,
    input.ema9, input.ema21, input.ema50,
  );

  // 7. Confidence + trade quality
  const confidence = computeConfidence(volumeScore, trendScore, technicalScore, overallScore, position);
  const tradeQuality = computeTradeQuality(position, trendLabel, technicalScore, volumeScore, overallScore, input.adx);

  // 8. Trade setup (entry / SL / TP)
  let hasTrade = false;
  let direction: "long" | "short" | null = null;
  let entry = 0;
  let stopLoss = 0;
  let risk = 0;
  let takeProfit: TpLevels = { tp1: 0, tp2: 0, tp3: 0 };
  let riskReward: TpLevels = { tp1: 0, tp2: 0, tp3: 0 };
  let expectedProfit: TpLevels = { tp1: 0, tp2: 0, tp3: 0 };
  let tsQuality = 0;

  if (position !== "neutral" && (isBuySignal(signal) || isSellSignal(signal))) {
    const dir = position as "long" | "short";
    const setup = generateTradeSetup(dir, input.currentPrice, [...input.supportLevels, ...input.resistanceLevels], input.atr);
    const preCond = validatePreConditions(input.adx, input.atr, input.supportLevels, input.resistanceLevels);

    if (preCond === null && setup.entry > 0 && setup.stopLoss > 0 && setup.risk > 0) {
      hasTrade = true;
      direction = dir;
      entry = setup.entry;
      stopLoss = setup.stopLoss;
      risk = setup.risk;
      takeProfit = setup.takeProfit;
      riskReward = calcRRRatios(entry, stopLoss, setup.takeProfit);
      expectedProfit = calcExpectedProfit(dir, entry, setup.takeProfit);
      tsQuality = tradeQuality;
    }
  }

  const tradeSetup: TradeSetupData = {
    hasTrade,
    reason: hasTrade ? null : "Pre-conditions not met for trade setup",
    direction,
    entry,
    stopLoss,
    risk,
    takeProfit,
    riskReward,
    expectedProfit,
    tradeQuality: tsQuality,
  };

  // 9. Validate consistency
  let validCheck = validateInternalConsistency(position, signal, trendLabel, overallScore, riskLevel, "skip");

  if (!validCheck.valid) {
    const resolved = resolveContradiction(position, signal, trendLabel, overallScore);
    position = resolved.position;
    signal = resolved.signal;
    overallScore = resolved.overallScore;
  }

  // 10. Recommendation (final decision)
  const rec = generateRecommendation(
    position, signal, overallScore, confidence, tradeQuality, riskLevel, riskRewardString,
    input.currentPrice, input.macdHistogram, input.rsi, input.ema20, input.adx,
    input.supportLevels, input.resistanceLevels,
  );

  // 11. Final validation — if inconsistent, force safe defaults
  const finalValid = validateInternalConsistency(position, signal, trendLabel, overallScore, riskLevel, rec.recommendation);
  if (!finalValid.valid) {
    signal = "neutral";
    rec.recommendation = "skip";
    rec.reasonCode = "SKIP_WEAK_TREND";
    rec.reason = "Inconsistent analysis — manual review advised.";
    rec.color = "#ef4444";
    rec.priority = 0;
  }

  // ═══ Stage 4: Final Status ════════════════════════════════════════
  // Pure decision table — produces exactly one final status.
  const stage4 = determineFinalStatus(
    stage1.tradeable,
    stage2.direction,
    stage3.quality,
  );

  return {
    marketDataStatus: "VALID",
    marketDataReason: null,
    tradeable: "YES",
    tradeabilityReason: null,
    marketDirection: stage2.direction,
    marketDirectionReason: stage2.reason,
    setupQuality: stage3.quality,
    setupQualityReason: stage3.reason,
    finalStatus: stage4.finalStatus,
    overallScore,
    volumeScore,
    trendScore,
    technicalScore,
    momentumScore,
    position,
    signal,
    trendLabel,
    trendAnalysis,
    riskScore,
    riskLevel,
    confidence,
    tradeQuality,
    riskRewardString,
    tradeSetup,
    recommendation: rec.recommendation,
    reasonCode: rec.reasonCode,
    reason: rec.reason,
    color: rec.color,
    priority: rec.priority,
  };
}
