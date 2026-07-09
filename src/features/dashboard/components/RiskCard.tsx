import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";
import { ProgressBar } from "./shared";

interface RiskCardProps {
  readonly title: string;
  readonly scoreLabel: string;
  readonly saferLabel: string;
  readonly riskierLabel: string;
  readonly data: DashboardViewModel["risk"];
}

export function RiskCard({
  title,
  scoreLabel,
  saferLabel,
  riskierLabel,
  data,
}: RiskCardProps) {
  return (
    <Card title={title} icon="🛡️">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{scoreLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">{riskierLabel}</span>
            <div className="w-16">
              <ProgressBar value={data.score} gradient={data.barGradient} />
            </div>
            <span className="text-[10px] text-gray-500">{saferLabel}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {data.factors.map((f) => (
            <div key={f.name} className="bg-gray-800/30 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{f.name}</p>
              <p className={`text-sm font-bold ${f.contribution >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {f.contributionLabel}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
