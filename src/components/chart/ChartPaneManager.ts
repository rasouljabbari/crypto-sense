import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { HistogramSeries, LineSeries, LineStyle } from "lightweight-charts";
import type { ChartDataPoint } from "@/lib/types";
import type { IndicatorId, PaneInfo } from "./types";
import { toChartTime } from "./types";

// ─── Chart Pane Manager ────────────────────────────────────────────────────
// Manages indicator panes in a lightweight-charts instance.
// Each indicator gets its own pane, stacked vertically below the price chart.

export class ChartPaneManager {
  private chart: IChartApi;
  private panes: Map<IndicatorId, PaneInfo> = new Map();

  constructor(chart: IChartApi) {
    this.chart = chart;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  hasPane(id: IndicatorId): boolean {
    return this.panes.has(id);
  }

  /** Add indicator pane. No-op if already exists. */
  add(id: IndicatorId, data: readonly ChartDataPoint[]): void {
    if (this.panes.has(id)) return;

    switch (id) {
      case "volume":
        this.addVolume(data);
        break;
      case "rsi":
        this.addRSI(data);
        break;
      case "dmi":
        this.addDMI(data);
        break;
    }
  }

  /** Remove indicator pane and all its series. */
  remove(id: IndicatorId): void {
    const pane = this.panes.get(id);
    if (!pane) return;

    // Remove price lines first
    if (pane.priceLines) {
      for (const pl of pane.priceLines) {
        try {
          pane.series[0]?.removePriceLine(pl);
        } catch {
          /* series may already be removed */
        }
      }
    }

    // Remove series from chart
    for (const series of pane.series) {
      try {
        this.chart.removeSeries(series);
      } catch {
        /* already removed */
      }
    }

    this.panes.delete(id);
  }

  /** Remove all indicator panes (keeps price chart intact). */
  removeAll(): void {
    const ids = Array.from(this.panes.keys());
    for (const id of ids) {
      this.remove(id);
    }
  }

  /** Sync pane state with a list of visible indicator IDs. */
  sync(visibleIds: IndicatorId[], data: readonly ChartDataPoint[]): void {
    // Remove panes that are no longer visible
    const toRemove = Array.from(this.panes.keys()).filter(
      (id) => !visibleIds.includes(id)
    );
    for (const id of toRemove) {
      this.remove(id);
    }

    // Add panes that should be visible but aren't yet
    for (const id of visibleIds) {
      if (!this.panes.has(id)) {
        this.add(id, data);
      }
    }
  }

  /** Destroy everything. Call on chart disposal. */
  destroy(): void {
    this.removeAll();
  }

  // ── Private: Indicator Implementations ──────────────────────────────────

  private addVolume(data: readonly ChartDataPoint[]): void {
    const pane = this.chart.addPane();
    pane.setStretchFactor(0.15);

    const series = this.chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      pane.paneIndex()
    );

    series.setData(
      data.map((k) => ({
        time: toChartTime(k.timestamp),
        value: k.volume,
        color:
          k.close >= k.open
            ? "rgba(52, 211, 153, 0.35)"
            : "rgba(239, 68, 68, 0.35)",
      }))
    );

    this.panes.set("volume", {
      paneIndex: pane.paneIndex(),
      series: [series],
    });
  }

  private addRSI(data: readonly ChartDataPoint[]): void {
    const rsiData = computeRSI(data);
    if (rsiData.length === 0) return;

    const pane = this.chart.addPane();
    pane.setStretchFactor(0.15);

    const series = this.chart.addSeries(
      LineSeries,
      {
        color: "#a78bfa",
        lineWidth: 1,
        lastValueVisible: true,
        priceLineVisible: false,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      },
      pane.paneIndex()
    );

    series.setData(rsiData);

    // Overbought / Oversold reference lines
    const obLine = series.createPriceLine({
      price: 70,
      color: "rgba(239, 68, 68, 0.25)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });
    const osLine = series.createPriceLine({
      price: 30,
      color: "rgba(52, 211, 153, 0.25)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });
    const midLine = series.createPriceLine({
      price: 50,
      color: "rgba(156, 163, 175, 0.15)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "",
    });

    this.panes.set("rsi", {
      paneIndex: pane.paneIndex(),
      series: [series],
      priceLines: [obLine, osLine, midLine],
    });
  }

  private addDMI(data: readonly ChartDataPoint[]): void {
    const dmiData = computeDMI(data);
    if (dmiData.plusDI.length === 0) return;

    const pane = this.chart.addPane();
    pane.setStretchFactor(0.18);

    const plusDISeries = this.chart.addSeries(
      LineSeries,
      {
        color: "#34d399",
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      },
      pane.paneIndex()
    );

    const minusDISeries = this.chart.addSeries(
      LineSeries,
      {
        color: "#f87171",
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      },
      pane.paneIndex()
    );

    const adxSeries = this.chart.addSeries(
      LineSeries,
      {
        color: "#fb923c",
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: false,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      },
      pane.paneIndex()
    );

    plusDISeries.setData(dmiData.plusDI);
    minusDISeries.setData(dmiData.minusDI);
    adxSeries.setData(dmiData.adx);

    // ADX 25 threshold — trend strength boundary
    const adxThreshold = adxSeries.createPriceLine({
      price: 25,
      color: "rgba(251, 146, 60, 0.2)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });

    this.panes.set("dmi", {
      paneIndex: pane.paneIndex(),
      series: [plusDISeries, minusDISeries, adxSeries],
      priceLines: [adxThreshold],
    });
  }
}

// ─── RSI Calculation (Wilder's Smoothed) ───────────────────────────────────

function computeRSI(
  data: readonly ChartDataPoint[],
  period = 14
): { time: UTCTimestamp; value: number }[] {
  if (data.length < period + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

  // Wilder's smoothing
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const result: { time: UTCTimestamp; value: number }[] = [];

  // First RSI value
  const firstRSI =
    avgLoss === 0 ? 100 : Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
  result.push({ time: toChartTime(data[period].timestamp), value: firstRSI });

  // Subsequent values with Wilder smoothing
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    const rsi =
      avgLoss === 0 ? 100 : Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
    result.push({ time: toChartTime(data[i + 1].timestamp), value: rsi });
  }

  return result;
}

// ─── DMI Calculation (Wilder's Method) ─────────────────────────────────────

function computeDMI(
  data: readonly ChartDataPoint[],
  period = 14
): {
  plusDI: { time: UTCTimestamp; value: number }[];
  minusDI: { time: UTCTimestamp; value: number }[];
  adx: { time: UTCTimestamp; value: number }[];
} {
  const len = data.length;
  if (len < period + 1) {
    return { plusDI: [], minusDI: [], adx: [] };
  }

  const tr: number[] = [];
  const pdm: number[] = [];
  const mdm: number[] = [];

  for (let i = 1; i < len; i++) {
    const h = data[i].high;
    const l = data[i].low;
    const pc = data[i - 1].close;

    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));

    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;

    pdm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    mdm.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Initial smoothing
  let sTR = 0;
  let sPDM = 0;
  let sMDM = 0;
  for (let i = 0; i < period; i++) {
    sTR += tr[i];
    sPDM += pdm[i];
    sMDM += mdm[i];
  }
  sTR /= period;
  sPDM /= period;
  sMDM /= period;

  const calcDI = (a: number) => (sTR === 0 ? 0 : (a / sTR) * 100);

  const outPDI: number[] = [];
  const outMDI: number[] = [];
  const outDX: number[] = [];

  let pdi0 = calcDI(sPDM);
  let mdi0 = calcDI(sMDM);
  outPDI.push(pdi0);
  outMDI.push(mdi0);
  outDX.push(pdi0 + mdi0 === 0 ? 0 : (Math.abs(pdi0 - mdi0) / (pdi0 + mdi0)) * 100);

  // Wilder smoothing loop
  for (let i = period; i < tr.length; i++) {
    sTR = (sTR * (period - 1) + tr[i]) / period;
    sPDM = (sPDM * (period - 1) + pdm[i]) / period;
    sMDM = (sMDM * (period - 1) + mdm[i]) / period;

    const p = calcDI(sPDM);
    const m = calcDI(sMDM);
    outPDI.push(p);
    outMDI.push(m);
    outDX.push(p + m === 0 ? 0 : (Math.abs(p - m) / (p + m)) * 100);
  }

  // ADX = smoothed DX
  const adxArr: number[] = [];
  for (let i = 0; i < outDX.length; i++) {
    if (i < period - 1) {
      adxArr.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += outDX[i - j];
    adxArr.push(Math.round((sum / period) * 100) / 100);
  }

  // Map to chart data points (offset by 1 because we skip first element in TR calc).
  // Carry forward last valid value so the line extends to chart's right edge.
  const pad = (
    arr: number[],
    total: number
  ): { time: UTCTimestamp; value: number }[] => {
    const out: { time: UTCTimestamp; value: number }[] = [];
    let lastValid: number | null = null;
    for (let i = 0; i < arr.length; i++) {
      const dataIdx = i + 1;
      if (dataIdx >= total) break;
      if (!isNaN(arr[i])) {
        lastValid = Math.round(arr[i] * 10) / 10;
      }
      if (lastValid !== null) {
        out.push({
          time: toChartTime(data[dataIdx].timestamp),
          value: lastValid,
        });
      }
    }
    // Extend to last candle if last value doesn't cover it
    if (lastValid !== null && out.length > 0) {
      const lastTime = toChartTime(data[total - 1].timestamp);
      if (out[out.length - 1].time !== lastTime) {
        out.push({ time: lastTime, value: lastValid });
      }
    }
    return out;
  };

  return {
    plusDI: pad(outPDI, len),
    minusDI: pad(outMDI, len),
    adx: pad(adxArr, len),
  };
}
