import type { ReactNode } from "react";

interface ProgressBarProps {
  readonly value: number;
  readonly color?: string;
  readonly gradient?: string;
  readonly height?: string;
}

export function ProgressBar({
  value,
  color,
  gradient,
  height = "h-1.5",
}: ProgressBarProps) {
  return (
    <div className={`flex-1 ${height} bg-gray-800 rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: gradient ? undefined : color,
          background: gradient,
        }}
      />
    </div>
  );
}

interface MiniBarProps {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

export function MiniBar({ label, value, color }: MiniBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 w-20 shrink-0 truncate">{label}</span>
      <ProgressBar value={value} color={color} />
      <span
        className="text-[11px] font-medium tabular-nums w-7 text-right"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

interface FactorListProps {
  readonly factors: readonly {
    readonly name: string;
    readonly contributionLabel: string;
    readonly contribution: number;
  }[];
}

export function FactorList({ factors }: FactorListProps) {
  return (
    <div className="space-y-1">
      {factors.map((f) => (
        <div key={f.name} className="flex justify-between text-[11px]">
          <span className="text-gray-500">{f.name}</span>
          <span className={f.contribution >= 0 ? "text-emerald-400" : "text-red-400"}>
            {f.contributionLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

interface StatBoxProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly valueClassName?: string;
}

export function StatBox({ label, value, valueClassName = "" }: StatBoxProps) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </div>
  );
}

interface EmptyStateProps {
  readonly message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <p className="text-xs text-gray-500 text-center py-4">{message}</p>;
}
