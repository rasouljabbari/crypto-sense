import type { ChartDataPoint } from "@/lib/types";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";

// ─── Indicator Identifiers ─────────────────────────────────────────────────

export type IndicatorId = "volume" | "rsi" | "dmi";

// ─── Indicator Configuration ───────────────────────────────────────────────

export interface IndicatorConfig {
  readonly id: IndicatorId;
  readonly label: string;
  enabled: boolean;
  readonly alwaysVisible: boolean;
  readonly order: number;
  readonly stretchFactor: number;
}

// ─── Pane Metadata ─────────────────────────────────────────────────────────

export interface PaneInfo {
  readonly paneIndex: number;
  readonly series: ISeriesApi<any>[];
  readonly priceLines?: ReturnType<ISeriesApi<any>["createPriceLine"]>[];
}

// ─── Chart Data Point (re-export for convenience) ─────────────────────────

export type { ChartDataPoint } from "@/lib/types";

// ─── Time Helper ───────────────────────────────────────────────────────────

export function toChartTime(ts: number): UTCTimestamp {
  return Math.floor(ts / 1000) as UTCTimestamp;
}

// ─── Indicator Renderer Interface ──────────────────────────────────────────

export interface IndicatorRenderer {
  readonly id: IndicatorId;
  create(chart: IChartApi, data: readonly ChartDataPoint[]): PaneInfo;
  update(pane: PaneInfo, chart: IChartApi, data: readonly ChartDataPoint[]): void;
  destroy(chart: IChartApi, pane: PaneInfo): void;
}
