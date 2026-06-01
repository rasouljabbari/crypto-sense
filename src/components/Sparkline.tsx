"use client";

import { useMemo } from "react";

interface Props {
  data: { close: number }[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "#22c55e", height = 48 }: Props) {
  const path = useMemo(() => {
    if (data.length < 2) return null;
    const vals = data.map((d) => d.close);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.08 || min * 0.05;
    const range = max - min + 2 * pad || 1;
    const w = 120;
    const h = height;

    const points = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min + pad) / range) * h;
      return `${x},${y}`;
    });

    const areaPoints = [...points, `${w},${h}`, `0,${h}`];

    return {
      line: `M${points.join(" L")}`,
      area: `M${areaPoints.join(" L")} Z`,
    };
  }, [data, height]);

  if (!path) {
    return <div style={{ height }} />;
  }

  return (
    <svg
      width="100%"
      height={height}
      viewBox="0 0 120 48"
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`spark-fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#spark-fill-${color.replace("#", "")})`} />
      <path d={path.line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
