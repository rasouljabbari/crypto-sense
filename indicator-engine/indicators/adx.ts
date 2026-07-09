import { calcTrueRange, calcWilderSmooth, calcSma, lastValid, isValid, round } from "../utils";
import { ADX_PERIOD, ADX_STRONG, ADX_TRENDING } from "../constants";
import type { AdxResult } from "../types";

export function adx(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  period: number = ADX_PERIOD,
): AdxResult {
  const minBars = period * 2;
  if (highs.length < minBars || lows.length < minBars || closes.length < minBars) {
    return { adx: 0, plusDI: 0, minusDI: 0, trend: "ranging" };
  }

  const trValues: number[] = new Array(highs.length).fill(NaN);
  const plusDM: number[] = new Array(highs.length).fill(NaN);
  const minusDM: number[] = new Array(highs.length).fill(NaN);

  for (let i = 1; i < highs.length; i++) {
    trValues[i] = calcTrueRange(highs[i], lows[i], closes[i - 1]);

    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    if (upMove > downMove && upMove > 0) {
      plusDM[i] = upMove;
    } else {
      plusDM[i] = 0;
    }

    if (downMove > upMove && downMove > 0) {
      minusDM[i] = downMove;
    } else {
      minusDM[i] = 0;
    }
  }

  const smoothTR = calcWilderSmooth(trValues, period);
  const smoothPlusDM = calcWilderSmooth(plusDM, period);
  const smoothMinusDM = calcWilderSmooth(minusDM, period);

  const plusDI: number[] = new Array(highs.length).fill(NaN);
  const minusDI: number[] = new Array(highs.length).fill(NaN);
  const dx: number[] = new Array(highs.length).fill(NaN);

  for (let i = 0; i < highs.length; i++) {
    const tr = smoothTR[i];
    if (isValid(tr) && tr !== 0) {
      plusDI[i] = (smoothPlusDM[i] / tr) * 100;
      minusDI[i] = (smoothMinusDM[i] / tr) * 100;
      const pdi = plusDI[i];
      const mdi = minusDI[i];
      if (isValid(pdi) && isValid(mdi) && pdi + mdi !== 0) {
        dx[i] = (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;
      }
    }
  }

  const adxValues = calcSma(dx, period);
  const adxValue = lastValid(adxValues);
  const lastPlusDI = lastValid(plusDI);
  const lastMinusDI = lastValid(minusDI);

  let trend: AdxResult["trend"] = "ranging";
  if (isValid(adxValue)) {
    if (adxValue >= ADX_STRONG) trend = "strong";
    else if (adxValue >= ADX_TRENDING) trend = "trending";
  }

  return {
    adx: round(adxValue),
    plusDI: round(lastPlusDI),
    minusDI: round(lastMinusDI),
    trend,
  };
}
