import { Card } from "@/components/Card";
import { ScoreRing } from "@/components/ScoreRing";
import type { DashboardViewModel } from "../types";
import { MiniBar } from "./shared";

interface CryptoScoreCardProps {
  readonly title: string;
  readonly overallLabel: string;
  readonly data: DashboardViewModel["cryptoScore"];
}

export function CryptoScoreCard({ title, overallLabel, data }: CryptoScoreCardProps) {
  return (
    <Card title={title} icon="📊">
      <div className="flex flex-col items-center gap-5">
        <ScoreRing value={data.overall} label={overallLabel} />
        <div className="w-full space-y-1.5">
          {data.dimensions.map((d) => (
            <MiniBar key={d.key} label={d.label} value={d.value} color={d.color} />
          ))}
        </div>
      </div>
    </Card>
  );
}
