"use client";

interface TradeSetupCardProps {
  readonly hasTrade: boolean;
  readonly reason: string | null;
  readonly entry: string;
  readonly entryDirection: "long" | "short";
  readonly entryDirectionLabel: string;
  readonly stopLoss: string;
  readonly tp1: string;
  readonly tp2: string;
  readonly tp3: string;
  readonly entryLabel: string;
  readonly stopLossLabel: string;
  readonly tp1Label: string;
  readonly tp2Label: string;
  readonly tp3Label: string;
  readonly directionLabel: string;
}

export function TradeSetupCard({
  hasTrade,
  reason,
  entry,
  entryDirection,
  entryDirectionLabel,
  stopLoss,
  tp1,
  tp2,
  tp3,
  entryLabel,
  stopLossLabel,
  tp1Label,
  tp2Label,
  tp3Label,
  directionLabel,
}: TradeSetupCardProps) {
  const isLong = entryDirection === "long";

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-gray-100">{entryLabel}</h3>
      </div>

      {/* No trade state */}
      {!hasTrade && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 text-yellow-400/60">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-300 mb-1">No Trade Setup</p>
          {reason && (
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">{reason}</p>
          )}
        </div>
      )}

      {/* Trade data */}
      {hasTrade && (
        <div className="space-y-3">
          {/* Entry + Direction */}
          <div className="flex items-center justify-between py-2.5 border-b border-gray-800/50">
            <span className="text-xs text-gray-500">{entryLabel}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-white">{entry}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isLong
                    ? "bg-emerald-900/30 text-emerald-400"
                    : "bg-red-900/30 text-red-400"
                }`}
              >
                {entryDirectionLabel}
              </span>
            </div>
          </div>

          {/* Stop Loss */}
          <div className="flex items-center justify-between py-2.5 border-b border-gray-800/50">
            <span className="text-xs text-gray-500">{stopLossLabel}</span>
            <span className="text-sm font-medium tabular-nums text-red-400">{stopLoss}</span>
          </div>

          {/* Take Profits */}
          {[
            { label: tp1Label, value: tp1, color: "text-emerald-400" },
            { label: tp2Label, value: tp2, color: "text-emerald-400" },
            { label: tp3Label, value: tp3, color: "text-emerald-400" },
          ].map((tp) => (
            <div
              key={tp.label}
              className="flex items-center justify-between py-2.5 border-b border-gray-800/50 last:border-0"
            >
              <span className="text-xs text-gray-500">{tp.label}</span>
              <span className={`text-sm font-medium tabular-nums ${tp.color}`}>{tp.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
