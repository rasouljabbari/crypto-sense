"use client";

import { useI18n } from "@/i18n/context";
import { CoinAnalysis } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  Treemap,
  Tooltip,
} from "recharts";

interface CoinNode {
  name: string;
  symbol: string;
  coinId: string;
  size: number;
  change: number;
  price: number;
  [k: string]: unknown;
}

const MAX_COINS = 100;

const EXCLUDED_SYMBOLS = new Set(["USDC", "FDUSD", "DAI", "TUSD", "USDP", "BUSD"]);

function changeColor(change: number): string {
  const p = Math.min(Math.abs(change) / 15, 1);
  if (change > 0) {
    const g = Math.round(180 - p * 80);
    return `rgb(${10 + p * 20}, ${g}, ${60 + p * 40})`;
  }
  const r = Math.round(180 + p * 75);
  return `rgb(${r}, ${30 + p * 20}, ${40 + p * 20})`;
}

function formatCompact(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  return n.toFixed(0);
}

function CustomContent(props: {
  x?: number; y?: number; width?: number; height?: number;
  depth?: number;
  name?: string; symbol?: string; coinId?: string; change?: number; price?: number;
  onClick?: (data: CoinNode) => void;
}) {
  const { x = 0, y = 0, width = 0, height = 0, depth, symbol, name, change = 0, coinId = "", onClick } = props;

  if (depth !== 1 || width < 20 || height < 20) return null;

  const bg = changeColor(change);
  const sign = change >= 0 ? "+" : "";
  const label = (symbol || name)?.toUpperCase();
  const showDetail = width > 60 && height > 40;

  return (
    <g
      onClick={() => onClick?.({ name, symbol, coinId, size: 0, change, price: 0 } as CoinNode)}
      style={{ cursor: "pointer" }}
    >
      <rect x={x} y={y} width={width} height={height} fill={bg} rx={2} />
      {showDetail && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2}
            fill="white" fontSize={11} fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
          >
            {label}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 16}
            fill={change >= 0 ? "#bbf7d0" : "#fecaca"}
            fontSize={10} fontWeight={600}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
          >
            {sign}{change.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
}

interface Props {
  coins: CoinAnalysis[];
}

export function TreemapChart({ coins }: Props) {
  const { t } = useI18n();
  const router = useRouter();

  const data: CoinNode[] = useMemo(() => {
    const filtered = coins.filter(
      (c) => {
        if (EXCLUDED_SYMBOLS.has(c.marketData.symbol)) return false;
        return c.marketData.volume24h > 0;
      }
    );
    const sorted = [...filtered].sort((a, b) => b.marketData.volume24h - a.marketData.volume24h);
    return sorted.slice(0, MAX_COINS).map((c) => ({
      name: c.marketData.name,
      symbol: c.marketData.symbol,
      coinId: c.coinId,
      size: c.marketData.volume24h,
      change: c.marketData.priceChangePercent24h,
      price: c.marketData.currentPrice,
    }));
  }, [coins]);

  const total = useMemo(() => data.reduce((s, c) => s + c.size, 0), [data]);

  const handleClick = useMemo(() => (node: CoinNode) => {
    if (node.coinId) router.push(`/coin/${node.coinId}`);
  }, [router]);

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="rgba(0,0,0,0.35)"
          content={<CustomContent onClick={handleClick} />}
          isAnimationActive={false}
        >
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const n = payload[0].payload as CoinNode;
              return (
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs text-gray-200">
                  <div className="font-bold text-sm text-white mb-1">{n.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{t("fear_greed.vol_label")}</span>
                    <span className="font-mono">${formatCompact(n.size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{t("fear_greed.price_label")}</span>
                    <span className="font-mono">${n.price < 1 ? n.price.toFixed(4) : n.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{t("fear_greed.h24_label")}</span>
                    <span className={`font-mono font-semibold ${n.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {n.change >= 0 ? "+" : ""}{n.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
      {data.length > 0 && (
        <div className="absolute bottom-3 left-3 text-[10px] text-gray-500 pointer-events-none">
          {data.length} coins · ${formatCompact(total)}
        </div>
      )}
    </div>
  );
}
