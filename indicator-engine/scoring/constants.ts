export const BASE_SCORE = 50;
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

export const TECHNICAL_RSI_OVERSOLD = 30;
export const TECHNICAL_RSI_NEUTRAL_LOW = 45;
export const TECHNICAL_RSI_NEUTRAL_HIGH = 60;
export const TECHNICAL_RSI_OVERBOUGHT = 70;
export const TECHNICAL_RSI_OVERSOLD_BONUS = 20;
export const TECHNICAL_RSI_LOW_BONUS = 10;
export const TECHNICAL_RSI_HIGH_PENALTY = -15;

export const TREND_EMA20_50_BONUS = 10;
export const TREND_EMA50_200_BONUS = 10;
export const TREND_ABOVE_RESISTANCE_BONUS = 5;
export const TREND_BELOW_SUPPORT_PENALTY = -10;

export const MOMENTUM_MACD_BULLISH_BONUS = 10;
export const MOMENTUM_ADX_THRESHOLD = 25;
export const MOMENTUM_ADX_BONUS = 5;

export const VOLUME_OBV_RISING_BONUS = 10;
export const VOLUME_VWAP_ABOVE_BONUS = 5;

export const VOLATILITY_HIGH_PENALTY = -5;
export const VOLATILITY_HIGH_LABELS: readonly string[] = ["high", "extreme"];

export const OVERALL_TECHNICAL_WEIGHT = 0.25;
export const OVERALL_TREND_WEIGHT = 0.25;
export const OVERALL_MOMENTUM_WEIGHT = 0.20;
export const OVERALL_VOLUME_WEIGHT = 0.15;
export const OVERALL_VOLATILITY_WEIGHT = 0.15;
