import type { ScoreEngineWeights } from "./types";

export const DEFAULT_WEIGHTS: ScoreEngineWeights = {
  trend: 0.35,
  momentum: 0.20,
  volume: 0.15,
  volatility: 0.10,
  risk: 0.20,
};

export const BASE_SCORE = 50;
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

export const SIGNAL_STRONG_BUY_MIN = 90;
export const SIGNAL_BUY_MIN = 75;
export const SIGNAL_NEUTRAL_MIN = 50;
export const SIGNAL_SELL_MIN = 30;
