"use client";

import { useI18n } from "@/i18n/context";
import type { CoinAnalysis } from "@/lib/types";

interface TradeSetupCardProps {
  readonly coin: CoinAnalysis;
}

function formatPrice(v: number): string {
  if (v === 0) return "—";
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  const pct = ((numerator / denominator) * 100).toFixed(2);
  return `${pct}%`;
}

// ─── No-Trade State ─────────────────────────────────────────────────────────

function NoTradeView({ reason }: { readonly reason: string | null }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-14 h-14 rounded-full bg-gray-800/60 border border-gray-700 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-400">
        {t("coin_detail.trade_setup.no_trade")}
      </p>
      {reason && (
        <p className="text-xs text-gray-500 text-center max-w-[240px] leading-relaxed">
          {reason}
        </p>
      )}
    </div>
  );
}

// ─── Active Trade View ──────────────────────────────────────────────────────

function ActiveTradeView({ coin }: { readonly coin: CoinAnalysis }) {
  const { t } = useI18n();
  const ts = coin.tradeSetup;
  const md = coin.marketData;
  const isLong = ts.direction === "long";

  const expectedProfitPct = isLong
    ? (ts.takeProfit.tp1 - ts.entry) / ts.entry
    : (ts.entry - ts.takeProfit.tp1) / ts.entry;

  const expectedLossPct = isLong
    ? (ts.entry - ts.stopLoss) / ts.entry
    : (ts.stopLoss - ts.entry) / ts.entry;

  const rrPrimary = ts.riskReward.tp1;

  const rows: {
    label: string;
    value: string;
    color?: string;
    icon?: React.ReactNode;
  }[] = [
    {
      label: t("coin_detail.trade_setup.direction"),
      value: isLong ? t("coin_detail.trade_setup.long") : t("coin_detail.trade_setup.short"),
      color: isLong ? "text-emerald-400" : "text-red-400",
      icon: (
        <svg className={`w-3.5 h-3.5 ${isLong ? "text-emerald-400" : "text-red-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={isLong ? "M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" : "M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25"} />
        </svg>
      ),
    },
    {
      label: t("coin_detail.trade_setup.entry"),
      value: formatPrice(ts.entry),
      color: "text-cyan-400",
    },
    {
      label: t("coin_detail.trade_setup.current_price"),
      value: formatPrice(md.currentPrice),
      color: "text-white",
    },
    {
      label: t("coin_detail.trade_setup.stop_loss"),
      value: formatPrice(ts.stopLoss),
      color: "text-red-400",
    },
    {
      label: t("coin_detail.trade_setup.take_profit"),
      value: formatPrice(ts.takeProfit.tp1),
      color: "text-emerald-400",
    },
    {
      label: t("coin_detail.trade_setup.risk_reward"),
      value: `1:${rrPrimary.toFixed(1)}`,
      color: rrPrimary >= 2 ? "text-emerald-400" : "text-yellow-400",
    },
    {
      label: t("coin_detail.trade_setup.expected_profit"),
      value: `+${formatPercent(ts.takeProfit.tp1 - ts.entry, ts.entry)}`,
      color: "text-emerald-400",
    },
    {
      label: t("coin_detail.trade_setup.expected_loss"),
      value: `-${formatPercent(Math.abs(ts.stopLoss - ts.entry), ts.entry)}`,
      color: "text-red-400",
    },
    {
      label: t("coin_detail.trade_setup.risk_level"),
      value: t(`coin_row.risk_${coin.riskLevel}`),
      color: coin.riskLevel === "low" ? "text-emerald-400" : coin.riskLevel === "medium" ? "text-yellow-400" : "text-red-400",
    },
  ];

  return (
    <div className="space-y-0">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`flex items-center justify-between py-2.5 ${
            i < rows.length - 1 ? "border-b border-gray-800/50" : ""
          }`}
        >
          <span className="text-xs text-gray-400 inline-flex items-center gap-1.5">
            {row.icon}
            {row.label}
          </span>
          <span className={`text-sm font-bold font-mono tabular-nums ${row.color ?? "text-gray-200"}`}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TradeSetupCard({ coin }: TradeSetupCardProps) {
  const { t } = useI18n();
  const ts = coin.tradeSetup;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
        {t("coin_detail.trade_setup.title")}
      </h3>

      {ts.hasTrade ? <ActiveTradeView coin={coin} /> : <NoTradeView reason={ts.reason} />}
    </div>
  );
}
