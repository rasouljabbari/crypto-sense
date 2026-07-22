import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";
import { EmptyState } from "./shared";

interface EntryCardProps {
  readonly title: string;
  readonly directionLabel: string;
  readonly data: DashboardViewModel["entry"];
  readonly invalidMessage: string;
}

export function EntryCard({
  title,
  directionLabel,
  data,
  invalidMessage,
}: EntryCardProps) {
  return (
    <Card title={title} icon="🚪">
      {data.isValid ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{data.price}</p>
            <span
              className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-xs font-bold ${
                data.direction === "long"
                  ? "bg-emerald-900/30 text-emerald-400"
                  : "bg-red-900/30 text-red-400"
              }`}
            >
              {data.directionLabel}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">{directionLabel}</span>
            <span className="text-gray-200">{data.directionLabel}</span>
          </div>
        </div>
      ) : (
        <EmptyState message={invalidMessage} />
      )}
    </Card>
  );
}
