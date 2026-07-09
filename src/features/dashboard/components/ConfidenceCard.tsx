import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";
import { FactorList, ProgressBar } from "./shared";

interface ConfidenceCardProps {
  readonly title: string;
  readonly data: DashboardViewModel["confidence"];
}

export function ConfidenceCard({ title, data }: ConfidenceCardProps) {
  return (
    <Card title={title} icon="💎">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{data.label}</span>
          <span className="text-2xl font-bold tabular-nums text-cyan-400">{data.value}%</span>
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar value={data.value} color={data.barColor} height="h-2" />
        </div>
        <FactorList factors={data.factors} />
      </div>
    </Card>
  );
}
