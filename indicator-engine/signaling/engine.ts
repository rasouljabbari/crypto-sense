import type { SignalAction, SignalResult } from "./types";
import {
  STRONG_BUY_MIN,
  BUY_MIN,
  NEUTRAL_MIN,
  SELL_MIN,
} from "./constants";

export function signal(score: number): SignalResult {
  let action: SignalAction;

  if (score >= STRONG_BUY_MIN) {
    action = "strong_buy";
  } else if (score >= BUY_MIN) {
    action = "buy";
  } else if (score >= NEUTRAL_MIN) {
    action = "neutral";
  } else if (score >= SELL_MIN) {
    action = "sell";
  } else {
    action = "strong_sell";
  }

  return { action, score };
}
