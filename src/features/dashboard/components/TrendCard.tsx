import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";
import { FactorList, ProgressBar } from "./shared";

interface TrendCardProps {
  readonly title: string;
  readonly trendLabel: string;
  readonly directionLabel: string;
  readonly data: DashboardViewModel["trend"];
}

export function TrendCard({
  title,
  trendLabel,
  directionLabel,
  data,
}: TrendCardProps) {
  return (
    <Card title={title} icon="📈">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{trendLabel}</span>
          <span className={`text-lg font-bold tabular-nums ${data.valueClassName}`}>
            {data.value}
          </span>
        </div>
        <ProgressBar value={data.value} gradient={data.barGradient} height="h-2" />
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{directionLabel}</span>
          <span className="font-medium text-gray-200">{data.directionLabel}</span>
        </div>
        <FactorList factors={data.factors} />
      </div>
    </Card>
  );
}
