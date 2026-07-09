// ---------------------------------------------------------------------------
// Average Directional Index (ADX)
// Trend strength indicator — uses +DI and -DI to measure directional movement
// ---------------------------------------------------------------------------

import type { AdxResult } from "../types";
import {
  calcTrueRange,
  wilderSmooth,
  calcSma,
  lastValid,
  isValidNumber,
} from "./_helpers";

export function adx(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  period: number = 14,
): AdxResult {
  const len = highs.length;
  if (len < period + 1) {
    return { adx: 0, plusDI: 0, minusDI: 0, trend: "ranging" };
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < len; i++) {
    tr.push(calcTrueRange(highs[i], lows[i], closes[i - 1]));
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  const smoothedTR = wilderSmooth(tr, period);
  const smoothedPlusDM = wilderSmooth(plusDM, period);
  const smoothedMinusDM = wilderSmooth(minusDM, period);

  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];

  for (let i = 0; i < smoothedTR.length; i++) {
    if (!isValidNumber(smoothedTR[i]) || smoothedTR[i] === 0) {
      plusDI.push(NaN);
      minusDI.push(NaN);
      dx.push(NaN);
      continue;
    }
    const pdi = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
    const mdi = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
    plusDI.push(pdi);
    minusDI.push(mdi);

    const sum = pdi + mdi;
    if (sum === 0) {
      dx.push(0);
    } else {
      dx.push(Math.abs(pdi - mdi) / sum * 100);
    }
  }

  const adxValues = calcSma(dx, period);
  const adxVal = lastValid(adxValues);
  const pdi = lastValid(plusDI);
  const mdi = lastValid(minusDI);

  let trend: "trending" | "ranging" | "strong";
  if (adxVal >= 50) trend = "strong";
  else if (adxVal >= 25) trend = "trending";
  else trend = "ranging";

  return {
    adx: Math.round(adxVal * 100) / 100,
    plusDI: Math.round(pdi * 100) / 100,
    minusDI: Math.round(mdi * 100) / 100,
    trend,
  };
}
