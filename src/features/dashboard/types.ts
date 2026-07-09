import type { TradingSignalType } from "@/features/analysis-engine/services/signaling";

export interface FactorItem {
  readonly name: string;
  readonly contribution: number;
  readonly contributionLabel: string;
}

export interface DimensionItem {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

export interface IndicatorItem {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly status: "positive" | "negative" | "neutral" | "warning";
  readonly statusLabel: string;
}

export interface TakeProfitLevel {
  readonly label: string;
  readonly price: string;
  readonly riskReward: string;
}

export interface DashboardViewModel {
  readonly cryptoScore: {
    readonly overall: number;
    readonly dimensions: readonly DimensionItem[];
  };
  readonly signal: {
    readonly type: TradingSignalType;
    readonly label: string;
    readonly factors: readonly FactorItem[];
  };
  readonly confidence: {
    readonly value: number;
    readonly label: string;
    readonly barColor: string;
    readonly factors: readonly FactorItem[];
  };
  readonly risk: {
    readonly score: number;
    readonly barGradient: string;
    readonly factors: readonly FactorItem[];
  };
  readonly trend: {
    readonly value: number;
    readonly valueClassName: string;
    readonly barGradient: string;
    readonly directionLabel: string;
    readonly factors: readonly FactorItem[];
  };
  readonly entry: {
    readonly price: string;
    readonly direction: "long" | "short";
    readonly directionLabel: string;
    readonly isValid: boolean;
    readonly reason: string | null;
  };
  readonly takeProfit: {
    readonly levels: readonly TakeProfitLevel[];
    readonly isValid: boolean;
    readonly reason: string | null;
  };
  readonly stopLoss: {
    readonly price: string;
    readonly riskAmount: string;
    readonly riskPercent: string;
    readonly isValid: boolean;
    readonly reason: string | null;
  };
  readonly indicators: {
    readonly items: readonly IndicatorItem[];
  };
}
