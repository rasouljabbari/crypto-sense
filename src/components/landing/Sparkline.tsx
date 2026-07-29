"use client";

import { useMemo } from "react";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ data, width = 80, height = 24, color, className = "" }: Props) {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 1;

    const xStep = (width - pad * 2) / (data.length - 1);
    const points = data.map((v, i) => {
      const x = pad + i * xStep;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    });
    return points.join(" ");
  }, [data, width, height]);

  const strokeColor = color || (data.length >= 2 && data[data.length - 1] >= data[0] ? "#22c55e" : "#ef4444");

  if (data.length < 2) return <div className={className} style={{ width, height }} />;

  return (
    <svg className={className} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
