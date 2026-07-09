"use client";

interface ScoreRingProps {
  readonly value: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly label?: string;
}

function scoreColor(value: number): string {
  if (value >= 80) return "#34d399";
  if (value >= 60) return "#22d3ee";
  if (value >= 40) return "#facc15";
  if (value >= 20) return "#fb923c";
  return "#f87171";
}

export function ScoreRing({
  value,
  size = 120,
  strokeWidth = 8,
  label,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
  const color = scoreColor(value);

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-1.5"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 absolute">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(31, 41, 55)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold tabular-nums leading-none transition-colors duration-300"
          style={{ color }}
        >
          {value}
        </span>
        {label && (
          <span className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
