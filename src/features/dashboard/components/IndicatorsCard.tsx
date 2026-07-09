import { Card } from "@/components/Card";
import type { DashboardViewModel } from "../types";

const STATUS_CLASSES: Record<
  DashboardViewModel["indicators"]["items"][number]["status"],
  string
> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-gray-400",
  warning: "text-yellow-400",
};

interface IndicatorsCardProps {
  readonly title: string;
  readonly data: DashboardViewModel["indicators"];
}

export function IndicatorsCard({ title, data }: IndicatorsCardProps) {
  return (
    <Card title={title} icon="📉" className="lg:col-span-2 xl:col-span-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">
        {data.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-1.5 border-b border-gray-800/30 last:border-0"
          >
            <span className="text-[11px] text-gray-500">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium tabular-nums text-gray-200">
                {item.value}
              </span>
              <span className={`text-[10px] ${STATUS_CLASSES[item.status]}`}>
                {item.statusLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
