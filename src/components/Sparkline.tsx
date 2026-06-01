"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useId } from "react";

interface Props {
  data: { close: number }[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "#22c55e", height = 48 }: Props) {
  const uid = useId();

  if (data.length < 2) {
    return <div style={{ height }} />;
  }

  const vals = data.map((d) => d.close);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.08 || min * 0.05;
  const domain: [number, number] = [min - pad, max + pad];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis domain={domain} hide />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sg-${uid})`}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
