import { Card } from "@/components/Card";
import { SignalBadge } from "@/components/SignalBadge";
import type { DashboardViewModel } from "../types";
import { FactorList } from "./shared";

interface SignalCardProps {
  readonly title: string;
  readonly data: DashboardViewModel["signal"];
}

export function SignalCard({ title, data }: SignalCardProps) {
  return (
    <Card title={title} icon="🎯">
      <div className="flex flex-col items-center gap-4">
        <SignalBadge
          signal={data.type}
          label={data.label}
          className="text-sm px-4 py-1.5"
        />
        <FactorList factors={data.factors} />
      </div>
    </Card>
  );
}
