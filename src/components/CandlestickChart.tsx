"use client";

import { COIN_SYMBOL_MAP, fetchKlines } from "@/api/binance";
import { useI18n } from "@/i18n/context";
import { useTheme } from "@/lib/theme";
import type { ChartDataPoint } from "@/lib/types";
import type { IChartApi, IPriceLine, ISeriesApi, MouseEventParams, Time, UTCTimestamp } from "lightweight-charts";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from "lightweight-charts";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";

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

interface Props {
  coinId: string;
}

interface TimeframeOption {
  label: string;
  interval: string;
  limit: number;
}

type ChartStatus = { type: "loading" } | { type: "ready"; data: ChartDataPoint[] } | { type: "error"; message?: string };

function fmtTime(k: ChartDataPoint): UTCTimestamp {
  return Math.floor(k.timestamp / 1000) as UTCTimestamp;
}

function chartStatusReducer(_: ChartStatus, action: ChartStatus): ChartStatus {
  return action;
}

export function CandlestickChart({ coinId }: Props) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { data: session, status: authStatus } = useSession();
  const isAuth = authStatus === "authenticated";
  const isAuthRef = useRef(isAuth);
  isAuthRef.current = isAuth;

  const TIMEFRAMES: TimeframeOption[] = [
    { label: "1H", interval: "1h", limit: 1000 },
    { label: "4H", interval: "4h", limit: 1000 },
    { label: "1D", interval: "1d", limit: 1000 },
    { label: "1W", interval: "1w", limit: 1000 },
    { label: "1M", interval: "1M", limit: 1000 },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [tf, setTf] = useState<TimeframeOption>(TIMEFRAMES[0]);
  const [status, dispatch] = useReducer(chartStatusReducer, { type: "loading" } as ChartStatus);

  const [hLineActive, setHLineActive] = useState(false);
  const hLineActiveRef = useRef(false);
  hLineActiveRef.current = hLineActive;
  const [showSMA, setShowSMA] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const reloadingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hlinePricesRef = useRef<number[]>([]);
  const hlinesRef = useRef<IPriceLine[]>([]);
  const smaSeriesArrRef = useRef<ISeriesApi<"Line">[]>([]);
  const loadedRef = useRef(false);
  const [crosshairValues, setCrosshairValues] = useState<{ vol?: string } | null>(null);

  const symbol = COIN_SYMBOL_MAP[coinId] ?? (coinId.toUpperCase().endsWith("USDT") ? coinId.toUpperCase() : `${coinId.toUpperCase()}USDT`);

  useEffect(() => {
    if (!symbol) return;
    reloadingRef.current = true;
    dispatch({ type: "loading" });
    let cancelled = false;

    fetchKlines(symbol, tf.interval, tf.limit)
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
  }, [symbol, tf]);

  const data = useMemo(
    () => status.type === "ready" ? status.data : [],
    [status]
  );

  function redrawHLines() {
    const cs = candleSeriesRef.current;
    if (!cs) return;

    for (const hl of hlinesRef.current) {
      try { cs.removePriceLine(hl); } catch { }
    }
    hlinesRef.current = [];

    for (const price of hlinePricesRef.current) {
      const hl = cs.createPriceLine({
        price,
        color: "#06b6d4",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: price.toFixed(2),
      });
      hlinesRef.current.push(hl);
    }
  }

  function clearAllDrawings() {
    for (const hl of hlinesRef.current) {
      try { candleSeriesRef.current?.removePriceLine(hl); } catch { }
    }
    hlinesRef.current = [];
    hlinePricesRef.current = [];

    if (isAuthRef.current) {
      fetch(`/api/chart-drawings?coinId=${encodeURIComponent(coinId)}`, { method: "DELETE" }).catch(() => { });
    }
  }

  function saveHLines(prices: number[]) {
    if (!isAuthRef.current) return;
    fetch("/api/chart-drawings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coinId, lines: prices }),
    }).catch(() => { });
  }

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

  useEffect(() => {
    if (authStatus !== "authenticated" || loadedRef.current) return;
    loadedRef.current = true;

    fetch(`/api/chart-drawings?coinId=${encodeURIComponent(coinId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.lines) && data.lines.length > 0) {
          hlinePricesRef.current = data.lines;
          redrawHLines();
        }
      })
      .catch(() => { });
  }, [authStatus, coinId]);

  useEffect(() => {
    for (const s of smaSeriesArrRef.current) {
      s.applyOptions({ visible: showSMA });
    }
  }, [showSMA]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) { console.warn("chart: no container"); return; }
    if (data.length === 0) { console.warn("chart: no data", status.type); return; }
    if (reloadingRef.current) { console.warn("chart: reloading"); return; }

    console.log("chart: creating chart with", data.length, "points");

    try {

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
          timeVisible: tf.interval === "1h" || tf.interval === "4h",
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

      candleSeries.setData(
        data.map((k) => ({
          time: fmtTime(k),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }))
      );

      if (data.length > 0) {
        const from = Math.max(0, data.length - 96);
        chart.timeScale().setVisibleRange({
          from: fmtTime(data[from]),
          to: fmtTime(data[data.length - 1]),
        });
      } else {
        chart.timeScale().fitContent();
      }

      const volPane = chart.addPane();
      volPane.setStretchFactor(0.2);

      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        color: "rgba(52, 211, 153, 0.3)",
      }, volPane.paneIndex());

      volSeries.setData(
        data.map((k) => ({
          time: fmtTime(k),
          value: k.volume,
          color: k.close >= k.open ? "rgba(52, 211, 153, 0.4)" : "rgba(239, 68, 68, 0.4)",
        }))
      );

      const sma7Data = calcSMA(data, 7);
      const sma21Data = calcSMA(data, 21);
      const sma99Data = calcSMA(data, 99);

      const newSmaSeries: ISeriesApi<"Line">[] = [];
      if (sma7Data.length > 0) {
        const s = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, lastValueVisible: false, priceLineVisible: false, visible: showSMA });
        s.setData(sma7Data);
        newSmaSeries.push(s);
      }
      if (sma21Data.length > 0) {
        const s = chart.addSeries(LineSeries, { color: "#ec4899", lineWidth: 1, lastValueVisible: false, priceLineVisible: false, visible: showSMA });
        s.setData(sma21Data);
        newSmaSeries.push(s);
      }
      if (sma99Data.length > 0) {
        const s = chart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 1, lastValueVisible: false, priceLineVisible: false, visible: showSMA });
        s.setData(sma99Data);
        newSmaSeries.push(s);
      }
      smaSeriesArrRef.current = newSmaSeries;



      const newHlines: IPriceLine[] = [];
      for (const price of hlinePricesRef.current) {
        const hl = candleSeries.createPriceLine({
          price,
          color: "#06b6d4",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: price.toFixed(2),
        });
        newHlines.push(hl);
      }
      hlinesRef.current = newHlines;

      function onClick(param: MouseEventParams<Time>) {
        if (!hLineActiveRef.current || !param.point) return;
        if (!chartRef.current || !candleSeriesRef.current) return;

        const y = param.point.y;
        const price = candleSeriesRef.current.coordinateToPrice(y);
        if (price === null) return;

        hlinePricesRef.current.push(price);
        const hl = candleSeriesRef.current.createPriceLine({
          price,
          color: "#06b6d4",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: price.toFixed(2),
        });
        hlinesRef.current.push(hl);

        saveHLines(hlinePricesRef.current);
      }

      chart.subscribeClick(onClick);

      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          setCrosshairValues(null);
          return;
        }
        if (!candleSeriesRef.current) return;
        const candleData = param.seriesData.get(candleSeriesRef.current) as { time: UTCTimestamp; open: number; high: number; low: number; close: number } | undefined;
        if (!candleData) return;
        const t = Number(candleData.time);
        const idx = data.findIndex((d) => Number(fmtTime(d)) === t);
        if (idx === -1) return;
        const vals: { rsi?: string; pdi?: string; mdi?: string; adx?: string; vol?: string } = {};
        const candle = data[idx];
        if (candle) {
          const v = candle.volume;
          if (v >= 1e9) vals.vol = (v / 1e9).toFixed(2) + "B";
          else if (v >= 1e6) vals.vol = (v / 1e6).toFixed(2) + "M";
          else if (v >= 1e3) vals.vol = (v / 1e3).toFixed(2) + "K";
          else vals.vol = v.toFixed(0);
        }
        setCrosshairValues(Object.keys(vals).length > 0 ? vals : null);
      });

      const ro = new ResizeObserver(() => {
        if (chartRef.current && container) {
          const r = container.getBoundingClientRect();
          chartRef.current.applyOptions({ width: r.width, height: r.height });
        }
      });
      ro.observe(container);

      return () => {
        ro.disconnect();
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
        candleSeriesRef.current = null;
        smaSeriesArrRef.current = [];
        hlinesRef.current = [];
      };
    } catch (err) { console.error("chart creation error:", err); }
  }, [data, tf.interval]);

  return (
    <div ref={wrapperRef} className={`w-full h-full flex flex-col ${isFullscreen ? `${isDark ? "bg-[#0d1117]" : "bg-white"} p-4` : ""}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.interval}
                onClick={() => setTf(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tf.interval === t.interval
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-gray-400 hover:text-gray-200 border border-transparent"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
            <button
              onClick={() => setHLineActive(v => !v)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${hLineActive
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
                }`}
              title="Horizontal line"
            >
              ☰ H-Line
            </button>
            <button
              onClick={() => setShowSMA(v => !v)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${showSMA
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
                }`}
            >
              3SMA
            </button>

            {hlinePricesRef.current.length > 0 && (
              <>
                <button
                  onClick={clearAllDrawings}
                  className="px-2 py-1 text-xs font-medium rounded-md transition-colors text-gray-400 hover:text-red-400 border border-transparent hover:border-red-500/30"
                  title="Clear all horizontal lines"
                >
                  ✕ Clear
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="px-2 py-1 text-xs font-medium rounded-md transition-colors text-gray-400 hover:text-gray-200 border border-transparent hover:border-gray-700"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "⊠" : "⛶"}
          </button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 rounded-lg overflow-hidden" />
        {/* Crosshair tooltip */}
        {crosshairValues?.vol && (
          <div className="absolute top-2 right-2 z-20 text-[9px] font-semibold pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-gray-900/80 text-sky-400 border border-gray-700/50">VOL {crosshairValues.vol}</span>
          </div>
        )}
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
        {status.type === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]/60 z-10 gap-1">
            <span className="text-xs text-red-400">{t("chart.failed")}</span>
            {"message" in status && status.message && (
              <span className="text-[10px] text-zinc-500 max-w-[280px] text-center leading-tight">{status.message}</span>
            )}
          </div>
        )}
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
