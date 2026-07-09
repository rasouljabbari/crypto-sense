import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";
import { EmptyState } from "./shared";

interface TakeProfitCardProps {
  readonly title: string;
  readonly riskRewardLabel: string;
  readonly data: DashboardViewModel["takeProfit"];
  readonly invalidMessage: string;
}

export function TakeProfitCard({
  title,
  riskRewardLabel,
  data,
  invalidMessage,
}: TakeProfitCardProps) {
  return (
    <Card title={title} icon="🎁">
      {data.isValid ? (
        <div className="space-y-2">
          {data.levels.map((level) => (
            <div
              key={level.label}
              className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2.5"
            >
              <div>
                <p className="text-[10px] text-gray-500 uppercase">{level.label}</p>
                <p className="text-sm font-bold tabular-nums text-emerald-400">{level.price}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">{riskRewardLabel}</p>
                <p className="text-xs font-bold tabular-nums text-cyan-400">{level.riskReward}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message={data.reason ?? invalidMessage} />
      )}
    </Card>
  );
}
