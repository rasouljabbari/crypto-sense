import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";
import { ConfidenceCard } from "./ConfidenceCard";
import { CryptoScoreCard } from "./CryptoScoreCard";
import { EntryCard } from "./EntryCard";
import { IndicatorsCard } from "./IndicatorsCard";
import { RiskCard } from "./RiskCard";
import { SignalCard } from "./SignalCard";
import { StopLossCard } from "./StopLossCard";
import { TakeProfitCard } from "./TakeProfitCard";
import { TrendCard } from "./TrendCard";

interface DashboardGridProps {
  readonly viewModel: DashboardViewModel;
  readonly labels: {
    readonly cryptoScore: string;
    readonly signal: string;
    readonly confidence: string;
    readonly risk: string;
    readonly trend: string;
    readonly entry: string;
    readonly takeProfit: string;
    readonly stopLoss: string;
    readonly indicators: string;
    readonly overallScore: string;
    readonly riskScore: string;
    readonly safer: string;
    readonly riskier: string;
    readonly trendScore: string;
    readonly direction: string;
    readonly riskReward: string;
    readonly riskAmount: string;
    readonly riskPercent: string;
    readonly invalidTrade: string;
  };
}

export function DashboardGrid({ viewModel, labels }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <CryptoScoreCard
        title={labels.cryptoScore}
        overallLabel={labels.overallScore}
        data={viewModel.cryptoScore}
      />
      <SignalCard title={labels.signal} data={viewModel.signal} />
      <ConfidenceCard title={labels.confidence} data={viewModel.confidence} />
      <RiskCard
        title={labels.risk}
        scoreLabel={labels.riskScore}
        saferLabel={labels.safer}
        riskierLabel={labels.riskier}
        data={viewModel.risk}
      />
      <TrendCard
        title={labels.trend}
        trendLabel={labels.trendScore}
        directionLabel={labels.direction}
        data={viewModel.trend}
      />
      <EntryCard
        title={labels.entry}
        directionLabel={labels.direction}
        data={viewModel.entry}
        invalidMessage={labels.invalidTrade}
      />
      <TakeProfitCard
        title={labels.takeProfit}
        riskRewardLabel={labels.riskReward}
        data={viewModel.takeProfit}
        invalidMessage={labels.invalidTrade}
      />
      <StopLossCard
        title={labels.stopLoss}
        riskAmountLabel={labels.riskAmount}
        riskPercentLabel={labels.riskPercent}
        data={viewModel.stopLoss}
        invalidMessage={labels.invalidTrade}
      />
      <IndicatorsCard title={labels.indicators} data={viewModel.indicators} />
    </div>
  );
}

interface DashboardSkeletonProps {
  readonly count?: number;
}

export function DashboardSkeleton({ count = 9 }: DashboardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} loading className={i === count - 1 ? "lg:col-span-2 xl:col-span-3" : ""} />
      ))}
    </div>
  );
}
