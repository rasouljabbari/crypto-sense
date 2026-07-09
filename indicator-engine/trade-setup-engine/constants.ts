export const ENTRY_ATR_MULTIPLIER = 0.5;
export const ENTRY_ATR_VOLATILITY_BUMP = 0.3;

export const STOP_ATR_MULTIPLIER = 2;
export const STOP_SUPPORT_BUFFER = 0.005;
export const STOP_RESISTANCE_BUFFER = 0.005;

export const TP_RISK_MULTIPLIER_1 = 2;
export const TP_RISK_MULTIPLIER_2 = 3;
export const TP_RISK_MULTIPLIER_3 = 5;

export const DEFAULT_RISK_PERCENT = 1;
export const VOLATILITY_RISK_MAP: Record<string, number> = {
  low: 1,
  medium: 1.5,
  high: 2,
  extreme: 2.5,
};

export const TREND_ALIGNED_BONUS = 25;
export const TREND_NEUTRAL_PENALTY = 5;
export const TREND_MISALIGNED_PENALTY = 15;

export const VOLATILITY_LOW_BONUS = 15;
export const VOLATILITY_MEDIUM_BONUS = 5;
export const VOLATILITY_HIGH_PENALTY = 5;
export const VOLATILITY_EXTREME_PENALTY = 15;

export const SIGNAL_STRONG_BONUS = 20;
export const SIGNAL_NORMAL_BONUS = 10;
export const SIGNAL_NEUTRAL_ZERO = 0;

export const SR_CLOSE_QUALITY = 20;
export const SR_MODERATE_QUALITY = 12;
export const SR_FAR_QUALITY = 5;
export const SR_NONE_PENALTY = 10;

export const SR_CLOSE_THRESHOLD = 0.01;
export const SR_MODERATE_THRESHOLD = 0.03;

export const MIN_TRADE_QUALITY = 50;
