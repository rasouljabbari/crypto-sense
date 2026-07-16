"use client";

import { COIN_SYMBOL_MAP, fetchKlines } from "@/api/binance";
import { useTimeframe } from "@/lib/timeframe";
import { useEffect, useState } from "react";

interface DmiValues {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

function computeDmi(highs: number[], lows: number[], closes: number[], period = 14): DmiValues {
  const len = highs.length;
  const nan = (n: number) => Array(n).fill(NaN) as number[];
  if (len < period + 1) return { adx: nan(len), plusDI: nan(len), minusDI: nan(len) };

  const tr: number[] = [], pdm: number[] = [], mdm: number[] = [];
  for (let i = 1; i < len; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    const up = highs[i] - highs[i - 1], down = lows[i - 1] - lows[i];
    pdm.push(up > down && up > 0 ? up : 0);
    mdm.push(down > up && down > 0 ? down : 0);
  }

  let sTR = 0, sPDM = 0, sMDM = 0;
  for (let i = 0; i < period; i++) { sTR += tr[i]; sPDM += pdm[i]; sMDM += mdm[i]; }
  sTR /= period; sPDM /= period; sMDM /= period;

  const outPDI: number[] = [NaN], outMDI: number[] = [NaN], outDX: number[] = [NaN];
  const calcDI = (a: number) => (sTR === 0 ? 0 : (a / sTR) * 100);
  const pdi0 = calcDI(sPDM), mdi0 = calcDI(sMDM);
  outPDI[0] = pdi0; outMDI[0] = mdi0;
  outDX[0] = pdi0 + mdi0 === 0 ? 0 : Math.abs(pdi0 - mdi0) / (pdi0 + mdi0) * 100;

  for (let i = period; i < tr.length; i++) {
    sTR = (sTR * (period - 1) + tr[i]) / period;
    sPDM = (sPDM * (period - 1) + pdm[i]) / period;
    sMDM = (sMDM * (period - 1) + mdm[i]) / period;
    const p = calcDI(sPDM), m = calcDI(sMDM);
    outPDI.push(p); outMDI.push(m);
    outDX.push(p + m === 0 ? 0 : Math.abs(p - m) / (p + m) * 100);
  }

  const adxArr: number[] = [];
  for (let i = 0; i < outDX.length; i++) {
    if (i < period - 1) { adxArr.push(NaN); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += outDX[i - j];
    adxArr.push(Math.round((sum / period) * 100) / 100);
  }

  const pad = (arr: number[], total: number) => {
    const out = nan(total);
    for (let i = 0; i < arr.length; i++) { const idx = i + 1; if (idx < total) out[idx] = Math.round(arr[i] * 100) / 100; }
    return out;
  };
  return { adx: pad(adxArr, len), plusDI: pad(outPDI, len), minusDI: pad(outMDI, len) };
}

interface Props {
  coinId: string;
}

export function DMIIndicator({ coinId }: Props) {
  const [dmi, setDmi] = useState<DmiValues | null>(null);
  const [loading, setLoading] = useState(true);
  const { timeframe, getLimit } = useTimeframe();

  useEffect(() => {
    const symbol = COIN_SYMBOL_MAP[coinId] ?? `${coinId.toUpperCase()}USDT`;
    setLoading(true);
    fetchKlines(symbol, timeframe, getLimit())
      .then((klines) => {
        const highs = klines.map(k => k.high);
        const lows = klines.map(k => k.low);
        const closes = klines.map(k => k.close);
        setDmi(computeDmi(highs, lows, closes));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [coinId, timeframe]);

  const adxVal = dmi?.adx[dmi.adx.length - 1];
  const plusDIVal = dmi?.plusDI[dmi.plusDI.length - 1];
  const minusDIVal = dmi?.minusDI[dmi.minusDI.length - 1];
  const hasValues = adxVal !== undefined && !isNaN(adxVal);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">DMI (14)</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasValues ? (
        <p className="text-xs text-gray-500">Not enough data</p>
      ) : (
        <div className="space-y-3">
          <DmiBar label="+DI" value={plusDIVal!} color="#22c55e" />
          <DmiBar label="-DI" value={minusDIVal!} color="#ef4444" />
          <DmiBar label="ADX" value={adxVal!} color="#f97316" />
          <div className="pt-2 border-t border-gray-800 text-xs text-gray-500">
            {adxVal! >= 25 ? (
              <span className="text-orange-400">Trending ({adxVal!.toFixed(1)})</span>
            ) : (
              <span className="text-gray-400">Ranging ({adxVal!.toFixed(1)})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DmiBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-gray-300 w-12 text-right">{value.toFixed(1)}</span>
    </div>
  );
}
