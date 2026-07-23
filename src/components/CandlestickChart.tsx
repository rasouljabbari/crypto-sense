"use client";

import { COIN_SYMBOL_MAP, fetchKlines } from "@/api/binance";
import { useI18n } from "@/i18n/context";
import { useTheme } from "@/lib/theme";
import { useTimeframe } from "@/lib/timeframe";
import type { ChartDataPoint } from "@/lib/types";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ChartPaneManager } from "./chart/ChartPaneManager";
import { IndicatorToolbar } from "./chart/IndicatorToolbar";
import { useIndicatorManager } from "./chart/useIndicatorManager";
import { CandleCountdown } from "./CandleCountdown";
import { TimeframeTabs } from "./TimeframeTabs";

// ─── Helpers ────────────────────────────────────────────────────────────

function calcSMA(data: ChartDataPoint[], period: number) {
  return data
    .map((_, i) => {
      if (i < period - 1) return null;
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j].close;
      return { time: fmtTime(data[i]), value: sum / period };
    })
    .filter((v): v is { time: UTCTimestamp; value: number } => v !== null)
    .slice(0, -1);
}

// ─── Types ──────────────────────────────────────────────────────────────

export interface SrLine {
  price: number;
  type: "support" | "resistance";
  priceRange?: { min: number; max: number };
  confidence?: number;
  strength?: string;
  reason?: string;
  detectedTimeframes?: readonly string[];
  touchCount?: number;
  reactionStrength?: number;
  volumeQuality?: "strong" | "moderate" | "weak" | "neutral";
  alignmentScore?: number;
}

interface SrLineMarker {
  line: SrLine;
  y: number;
  highlighted: boolean;
}

interface Props {
  coinId: string;
  srLines?: readonly SrLine[];
}

type ChartStatus = { type: "loading" } | { type: "ready"; data: ChartDataPoint[] } | { type: "error"; message?: string };

function fmtTime(k: ChartDataPoint): UTCTimestamp {
  return Math.floor(k.timestamp / 1000) as UTCTimestamp;
}

function chartStatusReducer(_: ChartStatus, action: ChartStatus): ChartStatus {
  return action;
}

// ─── Line Detail Panel ──────────────────────────────────────────────────

function ZoneDetailPanel({
  zone,
  onClose,
  isDark,
}: {
  zone: SrLine;
  onClose: () => void;
  isDark: boolean;
}) {
  const { t } = useI18n();
  const isSupport = zone.type === "support";

  const strengthLabel = zone.strength
    ?? (zone.confidence != null
      ? zone.confidence >= 70 ? "strong" : zone.confidence >= 40 ? "medium" : "weak"
      : "—");

  return (
    <div
      className={`absolute bottom-3 left-3 z-30 w-64 rounded-lg border shadow-xl p-3 text-[11px] leading-relaxed ${
        isDark
          ? "bg-gray-900/95 border-gray-700/60 text-gray-300"
          : "bg-white/95 border-gray-200 text-gray-600"
      } backdrop-blur-sm`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold text-xs ${
          isSupport ? "text-emerald-400" : "text-red-400"
        }`}>
          {isSupport ? t("order_book.sr_support") : t("order_book.sr_resistance")}
        </span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-sm leading-none"
        >
          ×
        </button>
      </div>

      {/* Price Range */}
      {zone.priceRange && (
        <div className="mb-2">
          <span className="text-gray-500">{t("chart.zone_range")}: </span>
          <span className="font-mono">
            {zone.priceRange.min.toFixed(4)} — {zone.priceRange.max.toFixed(4)}
          </span>
        </div>
      )}

      {/* Strength */}
      <div className="mb-1.5">
        <span className="text-gray-500">{t("chart.zone_strength")}: </span>
        <span className={`font-semibold capitalize ${
          strengthLabel === "strong"
            ? isSupport ? "text-emerald-400" : "text-red-400"
            : strengthLabel === "medium"
              ? "text-yellow-400"
              : "text-gray-500"
        }`}>
          {strengthLabel}
        </span>
        {zone.confidence != null && (
          <span className="text-gray-500 ml-1">({zone.confidence}%)</span>
        )}
      </div>

      {/* Reason */}
      {zone.reason && (
        <div className="mb-1.5">
          <span className="text-gray-500">{t("chart.zone_reason")}: </span>
          <span>
            {zone.alignmentScore != null && zone.detectedTimeframes && zone.detectedTimeframes.length > 0
              ? `${t("chart.alignment_prefix", { score: zone.alignmentScore, timeframes: zone.detectedTimeframes.join(", ") })} — ${zone.reason}`
              : zone.reason}
          </span>
        </div>
      )}

      {/* Touch Count */}
      {zone.touchCount != null && zone.touchCount > 0 && (
        <div className="mb-1.5">
          <span className="text-gray-500">{t("chart.zone_touches")}: </span>
          <span className="font-semibold">{zone.touchCount}</span>
        </div>
      )}

      {/* Detected Timeframes */}
      {zone.detectedTimeframes && zone.detectedTimeframes.length > 0 && (
        <div className="mb-1.5">
          <span className="text-gray-500">{t("chart.zone_timeframes")}: </span>
          <span>{zone.detectedTimeframes.join(", ")}</span>
        </div>
      )}

      {/* Volume Confirmation */}
      {zone.volumeQuality && (
        <div className="mb-1.5">
          <span className="text-gray-500">{t("chart.zone_volume")}: </span>
          <span className={
            zone.volumeQuality === "strong" ? "text-emerald-400" :
            zone.volumeQuality === "weak" ? "text-red-400" :
            zone.volumeQuality === "moderate" ? "text-yellow-400" : ""
          }>
            {t(`chart.vol_quality_${zone.volumeQuality}`)}
          </span>
        </div>
      )}

      {/* Reaction Strength */}
      {zone.reactionStrength != null && zone.reactionStrength > 0 && (
        <div>
          <span className="text-gray-500">{t("chart.zone_reaction")}: </span>
          <span className="font-semibold">{zone.reactionStrength}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function CandlestickChart({ coinId, srLines }: Props) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { timeframe: globalTf, getLimit } = useTimeframe();

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [status, dispatch] = useReducer(chartStatusReducer, { type: "loading" } as ChartStatus);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const reloadingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const smaSeriesArrRef = useRef<ISeriesApi<"Line">[]>([]);
  const [crosshairValues, setCrosshairValues] = useState<{ vol?: string; rsi?: string; adx?: string } | null>(null);
  const paneManagerRef = useRef<ChartPaneManager | null>(null);

  // ── Line overlay state ──────────────────────────────────────────────
  const [lineMarkers, setLineMarkers] = useState<SrLineMarker[]>([]);
  const [selectedZone, setSelectedZone] = useState<SrLine | null>(null);
  const currentPriceRef = useRef<number>(0);
  const dataRef = useRef<ChartDataPoint[]>([]);
  const rafRef = useRef<number>(0);

  const hasSrSupport = useMemo(() => srLines?.some(sl => sl.type === "support") ?? false, [srLines]);
  const hasSrResistance = useMemo(() => srLines?.some(sl => sl.type === "resistance") ?? false, [srLines]);

  // ── Line position calculation (throttled via rAF) ─────────────────
  const updateLinePositions = useCallback(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    const container = containerRef.current;
    if (!chart || !series || !container || !srLines || srLines.length === 0) {
      setLineMarkers([]);
      return;
    }

    const currentPrice = currentPriceRef.current;
    const markers: SrLineMarker[] = [];

    for (const sl of srLines) {
      const price = sl.priceRange
        ? (sl.priceRange.min + sl.priceRange.max) / 2
        : sl.price;

      const y = series.priceToCoordinate(price);
      if (y === null) continue;

      const containerHeight = container.clientHeight;
      if (y < 0 || y > containerHeight) continue;

      const highlighted = currentPrice > 0 && Math.abs(currentPrice - price) / currentPrice < 0.002;

      markers.push({ line: sl, y, highlighted });
    }

    setLineMarkers(markers);
  }, [srLines]);

  // Throttled update via rAF
  const scheduleLineUpdate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateLinePositions);
  }, [updateLinePositions]);

  const hasSr = useMemo(() => (srLines?.length ?? 0) > 0, [srLines]);

  const indicator = useIndicatorManager();

  const symbol = COIN_SYMBOL_MAP[coinId] ?? (coinId.toUpperCase().endsWith("USDT") ? coinId.toUpperCase() : `${coinId.toUpperCase()}USDT`);

  // ── Data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!symbol) return;
    reloadingRef.current = true;
    dispatch({ type: "loading" });
    let cancelled = false;

    fetchKlines(symbol, globalTf, getLimit())
      .then((d) => {
        if (!cancelled) {
          reloadingRef.current = false;
          dispatch({ type: "ready", data: d });
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          reloadingRef.current = false;
          dispatch({ type: "error", message: e.message });
        }
      });

    return () => { cancelled = true; };
  }, [symbol, globalTf]);

  const data = useMemo(
    () => status.type === "ready" ? status.data : [],
    [status]
  );

  // Track current price and keep dataRef in sync
  useEffect(() => {
    dataRef.current = data;
    if (data.length > 0) {
      currentPriceRef.current = data[data.length - 1].close;
    }
  }, [data]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Chart creation (only on mount / timeframe / theme change) ──────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    while (container.firstChild) container.removeChild(container.firstChild);

    const rect = container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 480;

    const bgColor = isDark ? "#0d1117" : "#ffffff";
    const textColor = isDark ? "#9ca3af" : "#6b7280";
    const gridColor = isDark ? "rgba(55, 65, 81, 0.4)" : "rgba(209, 213, 219, 0.5)";
    const borderColor = isDark ? "#374151" : "#d1d5db";
    const crosshairLabelBg = isDark ? "#1f2937" : "#f3f4f6";
    const crosshairLine = isDark ? "#6b7280" : "#9ca3af";

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: crosshairLine, width: 1, style: 2, labelBackgroundColor: crosshairLabelBg },
        horzLine: { color: crosshairLine, width: 1, style: 2, labelBackgroundColor: crosshairLabelBg },
      },
      timeScale: {
        borderColor,
        timeVisible: globalTf === "15m" || globalTf === "1h" || globalTf === "4h",
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#ef4444",
      borderUpColor: "#34d399",
      borderDownColor: "#ef4444",
      wickUpColor: "#34d399",
      wickDownColor: "#ef4444",
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    });

    candleSeriesRef.current = candleSeries;

    // Set data if already available (skip during reload to avoid stale flash)
    if (!reloadingRef.current && dataRef.current.length > 0) {
      const currentData = dataRef.current;
      candleSeries.setData(
        currentData.map((k) => ({
          time: fmtTime(k),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }))
      );

      const from = Math.max(0, currentData.length - 96);
      chart.timeScale().setVisibleRange({
        from: fmtTime(currentData[from]),
        to: fmtTime(currentData[currentData.length - 1]),
      });
    } else {
      chart.timeScale().fitContent();
    }

    // ── Indicator Panes ──
    const paneManager = new ChartPaneManager(chart);
    paneManagerRef.current = paneManager;
    if (!reloadingRef.current && dataRef.current.length > 0) {
      paneManager.sync(indicator.getVisibleIds(), dataRef.current);
    }

    // ── SMAs ──
    const newSmaSeries: ISeriesApi<"Line">[] = [];
    if (!reloadingRef.current && dataRef.current.length > 0) {
      const currentData = dataRef.current;
      const sma7Data = calcSMA(currentData, 7);
      const sma21Data = calcSMA(currentData, 21);
      const sma99Data = calcSMA(currentData, 99);
      if (sma7Data.length > 0) {
        const s = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, lastValueVisible: false, priceLineVisible: false, visible: true });
        s.setData(sma7Data);
        newSmaSeries.push(s);
      }
      if (sma21Data.length > 0) {
        const s = chart.addSeries(LineSeries, { color: "#ec4899", lineWidth: 1, lastValueVisible: false, priceLineVisible: false, visible: true });
        s.setData(sma21Data);
        newSmaSeries.push(s);
      }
      if (sma99Data.length > 0) {
        const s = chart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 1, lastValueVisible: false, priceLineVisible: false, visible: true });
        s.setData(sma99Data);
        newSmaSeries.push(s);
      }
    }
    smaSeriesArrRef.current = newSmaSeries;

    // ── Subscribe scroll → update zone positions ──
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      scheduleLineUpdate();
    });

      // ── Crosshair → update current price for highlight detection ──
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          setCrosshairValues(null);
          return;
        }
        if (!candleSeriesRef.current) return;
        const candleData = param.seriesData.get(candleSeriesRef.current) as { time: UTCTimestamp; open: number; high: number; low: number; close: number } | undefined;
        if (!candleData) return;
        const latestData = dataRef.current;
        const time = Number(candleData.time);
        const idx = latestData.findIndex((d) => Number(fmtTime(d)) === time);
        if (idx === -1) return;
        const vals: { rsi?: string; adx?: string; vol?: string } = {};
        const candle = latestData[idx];
        if (candle) {
          const v = candle.volume;
          if (v >= 1e9) vals.vol = (v / 1e9).toFixed(2) + "B";
          else if (v >= 1e6) vals.vol = (v / 1e6).toFixed(2) + "M";
          else if (v >= 1e3) vals.vol = (v / 1e3).toFixed(2) + "K";
          else vals.vol = v.toFixed(0);
          if (candle.rsi !== undefined) vals.rsi = candle.rsi.toFixed(1);
          if (candle.adx !== undefined) vals.adx = candle.adx.toFixed(1);
        }
        setCrosshairValues(Object.keys(vals).length > 0 ? vals : null);

        currentPriceRef.current = candleData.close;
        scheduleLineUpdate();
      });

    // ── Resize → update zone positions ──
    const ro = new ResizeObserver(() => {
      if (chartRef.current && container) {
        const r = container.getBoundingClientRect();
        chartRef.current.applyOptions({ width: r.width, height: r.height });
        scheduleLineUpdate();
      }
    });
    ro.observe(container);

    requestAnimationFrame(() => scheduleLineUpdate());

    return () => {
      ro.disconnect();
      paneManagerRef.current?.destroy();
      paneManagerRef.current = null;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candleSeriesRef.current = null;
      smaSeriesArrRef.current = [];
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [globalTf, isDark]);

  // ── Data update in-place (preserves scroll position) ───────────────
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries || data.length === 0) return;

    candleSeries.setData(
      data.map((k) => ({
        time: fmtTime(k),
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }))
    );

    // Update SMA series data in-place
    const sma7Data = calcSMA(data, 7);
    const sma21Data = calcSMA(data, 21);
    const sma99Data = calcSMA(data, 99);
    const smaArr = smaSeriesArrRef.current;
    if (smaArr.length > 0 && sma7Data.length > 0) smaArr[0].setData(sma7Data);
    if (smaArr.length > 1 && sma21Data.length > 0) smaArr[1].setData(sma21Data);
    if (smaArr.length > 2 && sma99Data.length > 0) smaArr[2].setData(sma99Data);

    // Sync indicator panes
    paneManagerRef.current?.sync(indicator.getVisibleIds(), data);

    // Update price ref for SR highlight
    currentPriceRef.current = data[data.length - 1].close;
    scheduleLineUpdate();
  }, [data]);

  // ── Dynamic Indicator Sync ──
  useEffect(() => {
    const pm = paneManagerRef.current;
    const chart = chartRef.current;
    if (!pm || !chart || data.length === 0) return;

    const unsub = indicator.manager.subscribe(() => {
      const pm2 = paneManagerRef.current;
      if (pm2) {
        pm2.sync(indicator.getVisibleIds(), data);
      }
    });

    return unsub;
  }, [indicator, data]);

  // ── Update zone rects when srLines change ──
  useEffect(() => {
    scheduleLineUpdate();
  }, [srLines, scheduleLineUpdate]);

  // ── Click outside zone → close detail ──
  const handleContainerClick = useCallback(() => {
    setSelectedZone(null);
  }, []);

  return (
    <div ref={wrapperRef} className={`w-full h-full flex flex-col ${isFullscreen ? `${isDark ? "bg-[#0d1117]" : "bg-white"} p-4` : ""}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <TimeframeTabs />
          <CandleCountdown />
          <IndicatorToolbar manager={indicator} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="px-2 py-1 text-xs font-medium rounded-md transition-colors text-gray-400 hover:text-gray-200 border border-transparent hover:border-gray-700"
            title={isFullscreen ? t("chart.exit_fullscreen") : t("chart.fullscreen")}
          >
            {isFullscreen ? "⊠" : "⛶"}
          </button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 rounded-lg overflow-hidden" onClick={handleContainerClick} />

        {/* ── SR Lines ──────────────────────────────────────────────── */}
        {hasSr && lineMarkers.map((lm, i) => (
          <div
            key={i}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              top: lm.y,
              left: 0,
              right: 0,
              height: 0,
              borderTop: `1px ${lm.highlighted ? "solid" : "dashed"} ${
                lm.line.type === "support"
                  ? lm.highlighted ? "rgba(52, 211, 153, 0.9)" : "rgba(52, 211, 153, 0.45)"
                  : lm.highlighted ? "rgba(239, 68, 68, 0.9)" : "rgba(239, 68, 68, 0.45)"
              }`,
              zIndex: lm.highlighted ? 5 : 2,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedZone(lm.line);
            }}
          />
        ))}

        {/* ── SR Legend ──────────────────────────────────────────────── */}
        {(hasSrSupport || hasSrResistance) && (
          <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-3">
            {hasSrSupport && (
              <span className="flex items-center gap-1.5 text-[9px] font-semibold text-gray-400">
                <span className="w-4 h-0 border-t border-dashed border-emerald-400/60" />
                {t("order_book.sr_support")}
              </span>
            )}
            {hasSrResistance && (
              <span className="flex items-center gap-1.5 text-[9px] font-semibold text-gray-400">
                <span className="w-4 h-0 border-t border-dashed border-red-400/60" />
                {t("order_book.sr_resistance")}
              </span>
            )}
          </div>
        )}

        {/* ── Zone Detail Panel ─────────────────────────────────────── */}
        {selectedZone && (
          <ZoneDetailPanel
            zone={selectedZone}
            onClose={() => setSelectedZone(null)}
            isDark={isDark}
          />
        )}

        {/* ── Crosshair Tooltip ─────────────────────────────────────── */}
        {crosshairValues && (
          <div className="absolute top-2 right-2 z-20 text-[9px] font-semibold pointer-events-none flex flex-col gap-1 items-end">
            {crosshairValues.vol && <span className="px-1.5 py-0.5 rounded bg-gray-900/80 text-sky-400 border border-gray-700/50">{t("chart.vol_label")} {crosshairValues.vol}</span>}
            {crosshairValues.rsi && <span className="px-1.5 py-0.5 rounded bg-gray-900/80 text-purple-400 border border-gray-700/50">{t("chart.rsi_label")} {crosshairValues.rsi}</span>}
            {crosshairValues.adx && <span className="px-1.5 py-0.5 rounded bg-gray-900/80 text-orange-400 border border-gray-700/50">{t("chart.adx_label")} {crosshairValues.adx}</span>}
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────── */}
        {status.type === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/60 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-[3px] border-gray-700" />
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-400 animate-spin" />
                <div className="absolute inset-[6px] rounded-full border-[3px] border-transparent border-b-emerald-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.6s" }} />
              </div>
              <span className="text-xs text-gray-400">{t("chart.loading")}</span>
            </div>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────── */}
        {status.type === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]/60 z-10 gap-1">
            <span className="text-xs text-red-400">{t("chart.failed")}</span>
            {"message" in status && status.message && (
              <span className="text-[10px] text-zinc-500 max-w-[280px] text-center leading-tight">{status.message}</span>
            )}
          </div>
        )}

        {/* ── No Data ────────────────────────────────────────────────── */}
        {status.type === "ready" && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/60 z-10">
            <span className="text-xs text-gray-500">{t("chart.no_data")}</span>
          </div>
        )}
        {!symbol && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/60 z-10">
            <span className="text-xs text-gray-500">{t("chart.no_data")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
