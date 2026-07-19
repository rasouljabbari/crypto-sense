"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/i18n/context";

function formatCompact(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  return n.toFixed(0);
}

interface McDataPoint {
  timestamp: number;
  value: number;
  volume: number;
}

export default function MarketCapChartInner({ mcData, mcDays }: { mcData: McDataPoint[]; mcDays: number }) {
  const { t } = useI18n();

  const vals = mcData.map((d) => d.value);
  const last = vals[vals.length - 1];
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const pad = (mx - mn) * 0.05 || mn * 0.02;
  const domain: [number, number] = [mn - pad, mx + pad];
  const midpoint = (domain[0] + domain[1]) / 2;
  const isUp = last >= midpoint;
  const mcapColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={mcData} margin={{ top: 5, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="mcapGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mcapColor} stopOpacity={0.45} />
            <stop offset="100%" stopColor={mcapColor} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
        <XAxis
          dataKey="timestamp"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={{ stroke: "#374151", strokeOpacity: 0.5 }}
          tickLine={false}
          tickFormatter={(ts: number) => {
            const d = new Date(ts * 1000);
            return mcDays === 0
              ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
              : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          yAxisId="mcap"
          domain={domain}
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v: number) => {
            if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
            if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
            return `$${(v / 1e6).toFixed(0)}M`;
          }}
        />
        <YAxis
          yAxisId="vol"
          orientation="right"
          domain={[0, (dataMax: number) => dataMax * 4]}
          tick={{ fill: "#6b7280", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={50}
          tickFormatter={(v: number) => {
            if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
            if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
            return `$${(v / 1e6).toFixed(0)}M`;
          }}
        />
        <Tooltip
          cursor={{ stroke: "#6b7280", strokeDasharray: "3 3", strokeOpacity: 0.5 }}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload as { timestamp: number; value: number; volume: number };
            return (
              <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs space-y-1">
                <p className="text-gray-400">
                  {new Date(d.timestamp * 1000).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
                <p className="text-white font-bold font-mono">{formatCompact(d.value)}</p>
                <p className="text-gray-400 font-mono">
                  {t("fear_greed.vol_label")} {formatCompact(d.volume)}
                </p>
              </div>
            );
          }}
        />
        <Bar
          yAxisId="vol"
          dataKey="volume"
          fill={mcapColor}
          fillOpacity={0.12}
          isAnimationActive={false}
        />
        <Area
          yAxisId="mcap"
          type="monotone"
          dataKey="value"
          stroke={mcapColor}
          strokeWidth={2}
          fill="url(#mcapGrad)"
          dot={false}
          activeDot={{ r: 4, fill: mcapColor, stroke: "#1f2937", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
