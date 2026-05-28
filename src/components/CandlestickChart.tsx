"use client";

import { COIN_SYMBOL_MAP, fetchKlines } from "@/api/binance";
import type { ChartDataPoint } from "@/lib/types";
import type { IChartApi, UTCTimestamp } from "lightweight-charts";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
} from "lightweight-charts";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useI18n } from "@/i18n/context";

interface Props {
  coinId: string;
}

interface TimeframeOption {
  label: string;
  interval: string;
  limit: number;
}

type ChartStatus = { type: "loading" } | { type: "ready"; data: ChartDataPoint[] } | { type: "error" };

function fmtTime(k: ChartDataPoint, interval: string): UTCTimestamp | string {
  const ms = k.timestamp;
  if (interval === "1h" || interval === "4h") {
    return Math.floor(ms / 1000) as UTCTimestamp;
  }
  return new Date(ms).toISOString().split("T")[0];
}

function chartStatusReducer(_: ChartStatus, action: ChartStatus): ChartStatus {
  return action;
}

export function CandlestickChart({ coinId }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [tf, setTf] = useState<TimeframeOption>({ label: t("chart.1h"), interval: "1h", limit: 168 });
  const [status, dispatch] = useReducer(chartStatusReducer, { type: "loading" } as ChartStatus);

  const TIMEFRAMES: TimeframeOption[] = [
    { label: t("chart.1h"), interval: "1h", limit: 168 },
    { label: t("chart.4h"), interval: "4h", limit: 168 },
  ];

  const symbol = COIN_SYMBOL_MAP[coinId] ?? (coinId.toUpperCase().endsWith("USDT") ? coinId.toUpperCase() : `${coinId.toUpperCase()}USDT`);

  useEffect(() => {
    if (!symbol) return;
    dispatch({ type: "loading" });
    let cancelled = false;

    fetchKlines(symbol, tf.interval, tf.limit)
      .then((klines) => {
        if (!cancelled) dispatch({ type: "ready", data: klines.length > 0 ? klines : [] });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "error" });
      });

    return () => { cancelled = true; };
  }, [symbol, tf]);

  const data = useMemo(
    () => status.type === "ready" ? status.data : [],
    [status]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    while (container.firstChild) container.removeChild(container.firstChild);

    const rect = container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 480;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#9ca3af",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(55, 65, 81, 0.4)" },
        horzLines: { color: "rgba(55, 65, 81, 0.4)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#6b7280", width: 1, style: 2, labelBackgroundColor: "#1f2937" },
        horzLine: { color: "#6b7280", width: 1, style: 2, labelBackgroundColor: "#1f2937" },
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: tf.interval === "1h" || tf.interval === "4h",
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#374151",
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
    });

    candleSeries.setData(
      data.map((k) => ({
        time: fmtTime(k, tf.interval),
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }))
    );

    chart.timeScale().fitContent();

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volSeries.setData(
      data.map((k) => ({
        time: fmtTime(k, tf.interval),
        value: k.volume,
        color: k.close >= k.open ? "rgba(52, 211, 153, 0.3)" : "rgba(239, 68, 68, 0.3)",
      }))
    );

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
    };
  }, [data, tf.interval]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
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
        {status.type === "loading" && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-3 border-2 border-gray-500 border-t-emerald-400 rounded-full animate-spin" />
            {t("chart.loading")}
          </div>
        )}
        {status.type === "error" && <span className="text-xs text-red-400">{t("chart.failed")}</span>}
        {status.type === "ready" && data.length === 0 && <span className="text-xs text-gray-500">{t("chart.no_data")}</span>}
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 rounded-lg overflow-hidden" />
    </div>
  );
}
