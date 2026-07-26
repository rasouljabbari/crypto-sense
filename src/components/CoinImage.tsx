"use client";

import Image from "next/image";
import { useState, useMemo } from "react";

interface Props {
  src: string;
  alt: string;
  symbol?: string;
  className?: string;
  size?: number;
}

const COLORS = [
  "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
  "#10b981", "#6366f1", "#d946ef", "#0ea5e9", "#84cc16",
];

function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function CoinImage({ src, alt = "", symbol = "", className = "w-6 h-6 rounded-full", size = 24 }: Props) {
  const [failed, setFailed] = useState(false);
  const label = (symbol || alt).slice(0, 2).toUpperCase();
  const bg = useMemo(() => hashColor(symbol || alt), [symbol, alt]);

  if (failed || !src) {
    return (
      <div
        className={`${className} flex items-center justify-center overflow-hidden`}
        style={{ backgroundColor: `${bg}30` }}
      >
        <span
          className="font-bold select-none"
          style={{ color: bg, fontSize: Math.max(size * 0.4, 10) }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}
