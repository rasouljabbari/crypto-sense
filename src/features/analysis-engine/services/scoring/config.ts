export const SCORING_CONFIG = {
  weights: {
    trend: 0.35,
    momentum: 0.20,
    volume: 0.15,
    volatility: 0.10,
    risk: 0.20,
  },
  trend: {
    emaAlignment: { fullBull: 20, partialBull: 10, mixed: 0, partialBear: -10, fullBear: -20 },
    adxStrength: { strong: 15, trending: 10, weak: 5, none: 0 },
    priceVsEma50: { above: 5, below: -5 },
    priceVsEma200: { above: 5, below: -5 },
  },
  momentum: {
    rsi: { oversold: 20, low: 15, neutral: 5, high: -5, overbought: -15 },
    macd: { bullishCross: 15, aboveSignal: 10, belowSignal: -10, bearishCross: -15 },
    priceChange: { strongBull: 10, bull: 5, weakBull: 2, weakBear: -2, bear: -5, strongBear: -10 },
    stochRsi: { oversold: 5, overbought: -5 },
  },
  volume: {
    obvTrend: { rising: 10, flat: 5, falling: -10 },
    volMcCap: { high: 10, medium: 5, low: 2, veryLow: -5 },
  },
  volatility: {
    atr: { low: 5, normal: 2, high: -5, extreme: -10 },
    bollinger: { inside: 5, belowLower: 2, aboveUpper: -5 },
  },
  risk: {
    liquidity: { high: 10, medium: 5, low: 0, veryLow: -10 },
    srDistance: { wide: 5, normal: 2, tight: -5 },
    adxStability: { clear: 5, moderate: 0, choppy: -5 },
  },
  confidence: {
    agreement: { full: 20, partial: 10, mixed: 0, conflicting: -10 },
    dataQuality: { complete: 10, minorMissing: 0, majorMissing: -15 },
  },
} as const;
