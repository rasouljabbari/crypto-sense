"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/i18n/context";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface FngEntry {
  value: number;
  classification: string;
  timestamp: number;
  dateLabel: string;
  btcPrice?: number;
  btcVolume?: number;
}

function fngColor(value: number): string {
  if (value <= 25) return "#ef4444";
  if (value <= 45) return "#f97316";
  if (value <= 55) return "#eab308";
  if (value <= 75) return "#22c55e";
  return "#16a34a";
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateNumeric(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCompact(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  return n.toFixed(0);
}

export default function FearGreedPage() {
  const { t, dir } = useI18n();
  const [raw, setRaw] = useState<FngEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [historical, setHistorical] = useState<{
    now: FngEntry;
    yesterday: FngEntry;
    lastWeek: FngEntry;
    lastMonth: FngEntry;
    yearlyHigh: FngEntry;
    yearlyLow: FngEntry;
  } | null>(null);

  useEffect(() => {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 365 * 86400;
    fetch(`/api/fear-greed?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((json: {
        data: {
          dataList: { score: number; name: string; timestamp: string; btcPrice: string; btcVolume: string }[];
          historicalValues: {
            now: { score: number; name: string; timestamp: string };
            yesterday: { score: number; name: string; timestamp: string };
            lastWeek: { score: number; name: string; timestamp: string };
            lastMonth: { score: number; name: string; timestamp: string };
            yearlyHigh: { score: number; name: string; timestamp: string };
            yearlyLow: { score: number; name: string; timestamp: string };
          };
        };
      }) => {
        const entries: FngEntry[] = json.data.dataList.map((d) => ({
          value: d.score,
          classification: d.name,
          timestamp: Number(d.timestamp),
          dateLabel: formatDate(Number(d.timestamp)),
          btcPrice: Number(d.btcPrice),
          btcVolume: Number(d.btcVolume),
        }));
        setRaw(entries);
        setHistorical({
          now: { value: json.data.historicalValues.now.score, classification: json.data.historicalValues.now.name, timestamp: Number(json.data.historicalValues.now.timestamp), dateLabel: formatDate(Number(json.data.historicalValues.now.timestamp)) },
          yesterday: { value: json.data.historicalValues.yesterday.score, classification: json.data.historicalValues.yesterday.name, timestamp: Number(json.data.historicalValues.yesterday.timestamp), dateLabel: formatDate(Number(json.data.historicalValues.yesterday.timestamp)) },
          lastWeek: { value: json.data.historicalValues.lastWeek.score, classification: json.data.historicalValues.lastWeek.name, timestamp: Number(json.data.historicalValues.lastWeek.timestamp), dateLabel: formatDate(Number(json.data.historicalValues.lastWeek.timestamp)) },
          lastMonth: { value: json.data.historicalValues.lastMonth.score, classification: json.data.historicalValues.lastMonth.name, timestamp: Number(json.data.historicalValues.lastMonth.timestamp), dateLabel: formatDate(Number(json.data.historicalValues.lastMonth.timestamp)) },
          yearlyHigh: { value: json.data.historicalValues.yearlyHigh.score, classification: json.data.historicalValues.yearlyHigh.name, timestamp: Number(json.data.historicalValues.yearlyHigh.timestamp), dateLabel: formatDate(Number(json.data.historicalValues.yearlyHigh.timestamp)) },
          yearlyLow: { value: json.data.historicalValues.yearlyLow.score, classification: json.data.historicalValues.yearlyLow.name, timestamp: Number(json.data.historicalValues.yearlyLow.timestamp), dateLabel: formatDate(Number(json.data.historicalValues.yearlyLow.timestamp)) },
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const current = historical?.now ?? raw[0] ?? null;

  const chartData = useMemo(() => {
    const maxVol = Math.max(...raw.map((d) => d.btcVolume || 0), 1);
    return raw.map((d) => ({
      ...d,
      volPct: ((d.btcVolume || 0) / maxVol) * 25,
    }));
  }, [raw]);

  const xTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = Math.max(1, Math.floor(chartData.length / 5));
    const ticks: string[] = [];
    for (let i = 0; i < chartData.length; i += step) {
      ticks.push(chartData[i].dateLabel);
    }
    const last = chartData[chartData.length - 1].dateLabel;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [chartData]);

  const zoneLabel = useMemo(() => {
    if (!current) return "";
    return t(`fear_greed.classes.${current.classification.toLowerCase().replace(/\s+/g, "_")}`);
  }, [current, t]);

  const chartDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const vals = chartData.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(5, Math.round((max - min) * 0.08));
    return [Math.max(0, Math.floor(min - pad)), Math.min(100, Math.ceil(max + pad))];
  }, [chartData]);

  const yTicks = useMemo(() => {
    const [lo, hi] = chartDomain;
    return [0, 25, 45, 55, 75, 100].filter((t) => t >= lo && t <= hi);
  }, [chartDomain]);

  const zoneLabels = useMemo(() => {
    const [lo, hi] = chartDomain;
    const zones = [
      { value: 87.5, label: t("fear_greed.classes.greed"), color: "#22c55e" },
      { value: 50, label: t("fear_greed.classes.neutral"), color: "#eab308" },
      { value: 12.5, label: t("fear_greed.classes.fear"), color: "#ef4444" },
    ];
    return zones.filter((z) => z.value >= lo && z.value <= hi);
  }, [chartDomain, t]);

  const yearly = historical
    ? { high: historical.yearlyHigh, low: historical.yearlyLow }
    : null;

  const recent = null;

  return (
    <DashboardLayout>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{t("fear_greed.title")}</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1">{t("fear_greed.subtitle")}</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-16 text-center text-sm text-gray-500">
            {t("chart.loading")}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Right — Chart (9 cols) */}
            <div className="lg:col-span-9 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400">{t("fear_greed.chart_title")}</h3>
                {current && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">{t("fear_greed.now")}:</span>
                    <span className="font-bold font-mono" style={{ color: fngColor(current.value) }}>{current.value}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        color: fngColor(current.value),
                        backgroundColor: `${fngColor(current.value)}1a`,
                        border: `1px solid ${fngColor(current.value)}33`,
                      }}
                    >
                      {zoneLabel}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fngGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="30%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="50%" stopColor="#eab308" stopOpacity={0.15} />
                        <stop offset="70%" stopColor="#f97316" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>

                    {/* Zone backgrounds */}
                    <ReferenceArea y1={75} y2={100} fill="#22c55e" fillOpacity={0.06} />
                    <ReferenceArea y1={55} y2={75} fill="#86efac" fillOpacity={0.04} />
                    <ReferenceArea y1={45} y2={55} fill="#eab308" fillOpacity={0.04} />
                    <ReferenceArea y1={25} y2={45} fill="#f97316" fillOpacity={0.04} />
                    <ReferenceArea y1={0} y2={25} fill="#ef4444" fillOpacity={0.06} />

                    {/* Zone boundary lines */}
                    <ReferenceLine y={75} stroke="#22c55e" strokeOpacity={0.25} strokeDasharray="4 4" />
                    <ReferenceLine y={55} stroke="#eab308" strokeOpacity={0.2} strokeDasharray="4 4" />
                    <ReferenceLine y={45} stroke="#eab308" strokeOpacity={0.2} strokeDasharray="4 4" />
                    <ReferenceLine y={25} stroke="#ef4444" strokeOpacity={0.25} strokeDasharray="4 4" />

                    {/* Zone labels on Y-axis */}
                    {zoneLabels.map((z) => (
                      <ReferenceLine key={z.label} y={z.value} strokeWidth={0} label={{ value: z.label, position: "right", fill: z.color, fontSize: 9, opacity: 0.5 }} />
                    ))}

                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} />
                    <XAxis
                      dataKey="dateLabel"
                      ticks={xTicks}
                      tick={{ fill: "#9ca3af", fontSize: 10 }}
                      axisLine={{ stroke: "#374151", strokeOpacity: 0.5 }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={chartDomain}
                      ticks={yTicks}
                      tick={{ fill: "#6b7280", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={["auto", "auto"]}
                      tick={{ fill: "#f7931a", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(v: number) => "$" + (v / 1000).toFixed(0) + "k"}
                    />
                    <Tooltip
                      cursor={{ stroke: "#6b7280", strokeDasharray: "3 3", strokeOpacity: 0.5 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload as FngEntry & { volPct: number };
                        const color = fngColor(d.value);
                        return (
                          <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs space-y-1.5">
                            <p className="text-gray-400">{formatDateNumeric(d.timestamp)}</p>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-sm bg-emerald-400 shrink-0" />
                              <span className="text-gray-400 w-16">{t("fear_greed.fg_label")}</span>
                              <span className="text-white font-bold font-mono">{d.value}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}33` }}>
                                {d.classification}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-sm bg-amber-500 shrink-0" />
                              <span className="text-gray-400 w-16">{t("fear_greed.btc_label")}</span>
                              <span className="text-white font-bold font-mono">${d.btcPrice!.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-sm bg-violet-400 shrink-0" />
                              <span className="text-gray-400 w-16">{t("fear_greed.volume_label")}</span>
                              <span className="text-white font-bold font-mono">${formatCompact(d.btcVolume!)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar yAxisId="left" dataKey="volPct" fill="#a78bfa" fillOpacity={0.1} barSize={3} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="value"
                      stroke="white"
                      strokeWidth={2.5}
                      fill="url(#fngGradient)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#22c55e", stroke: "#1f2937", strokeWidth: 2 }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="btcPrice"
                      stroke="#f7931a"
                      strokeWidth={1.5}
                      fill="none"
                      dot={false}
                      activeDot={{ r: 3, fill: "#f7931a", stroke: "#1f2937", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Left — 3 cards (3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              {/* Card 1: Current Index */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col items-center text-center">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">{t("fear_greed.current_title")}</h3>
                {current && (
                  <>
                    <div
                      className="text-5xl sm:text-6xl font-black mb-2"
                      style={{ color: fngColor(current.value) }}
                    >
                      {current.value}
                    </div>
                    <span
                      className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{
                        color: fngColor(current.value),
                        backgroundColor: `${fngColor(current.value)}1a`,
                        border: `1px solid ${fngColor(current.value)}33`,
                      }}
                    >
                      {t(`fear_greed.classes.${current.classification.toLowerCase().replace(/\s+/g, "_")}`)}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-2">
                      {t("fear_greed.updated", { date: formatDateNumeric(current.timestamp) })}
                    </p>
                  </>
                )}
              </div>

              {/* Card 2: Historical Values */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">{t("fear_greed.historical_title")}</h3>
                {historical && (
                  <div className="space-y-1.5">
                    {[
                      { key: "yesterday", label: t("fear_greed.yesterday"), entry: historical.yesterday },
                      { key: "lastWeek", label: t("fear_greed.last_week"), entry: historical.lastWeek },
                      { key: "lastMonth", label: t("fear_greed.last_month"), entry: historical.lastMonth },
                    ].map(({ label, entry }) => (
                      <div key={entry.timestamp} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 w-20">{label}</span>
                        <span className="font-bold font-mono" style={{ color: fngColor(entry.value) }}>
                          {entry.value}
                        </span>
                        <span className="text-gray-500 text-[10px] w-16 text-right">
                          {t(`fear_greed.classes.${entry.classification.toLowerCase().replace(/\s+/g, "_")}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 3: Yearly High & Low */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">{t("fear_greed.yearly_title")}</h3>
                {yearly && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-emerald-400 text-[10px] font-medium">{t("fear_greed.high")}</span>
                        <span className="text-emerald-400 font-black text-lg">{yearly.high.value}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {formatDateNumeric(yearly.high.timestamp)}
                      </p>
                    </div>
                    <div className="border-t border-gray-800 pt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-red-400 text-[10px] font-medium">{t("fear_greed.low")}</span>
                        <span className="text-red-400 font-black text-lg">{yearly.low.value}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {formatDateNumeric(yearly.low.timestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </DashboardLayout>
  );
}
