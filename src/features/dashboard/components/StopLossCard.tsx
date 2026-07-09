import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";
import { EmptyState, StatBox } from "./shared";

interface StopLossCardProps {
  readonly title: string;
  readonly riskAmountLabel: string;
  readonly riskPercentLabel: string;
  readonly data: DashboardViewModel["stopLoss"];
  readonly invalidMessage: string;
}

export function StopLossCard({
  title,
  riskAmountLabel,
  riskPercentLabel,
  data,
  invalidMessage,
}: StopLossCardProps) {
  return (
    <Card title={title} icon="⛔">
      {data.isValid ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-red-400">{data.price}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label={riskAmountLabel} value={data.riskAmount} valueClassName="text-red-400" />
            <StatBox label={riskPercentLabel} value={data.riskPercent} valueClassName="text-orange-400" />
          </div>
        </div>
      ) : (
        <EmptyState message={data.reason ?? invalidMessage} />
      )}
    </Card>
  );
}
