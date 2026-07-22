"use client";

import type { DrawTool } from "./useDrawingTools";

interface Props {
  readonly activeTool: DrawTool | null;
  readonly onSelectTool: (tool: DrawTool | null) => void;
  readonly drawingCount: number;
  readonly onClearAll: () => void;
}

const TOOLS: { key: DrawTool; label: string; icon: React.ReactNode }[] = [
  {
    key: "horizontal_ray",
    label: "H-Ray",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="8" x2="14" y2="8" />
        <polyline points="10,5 14,8 10,11" />
      </svg>
    ),
  },
  {
    key: "horizontal_line",
    label: "H-Line",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="2" y1="5" x2="2" y2="11" />
        <line x1="14" y1="5" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    key: "trend_line",
    label: "Trend",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="13" x2="13" y2="3" />
        <circle cx="3" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="13" cy="3" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function DrawingToolbar({ activeTool, onSelectTool, drawingCount, onClearAll }: Props) {
  return (
    <div
      className="absolute z-30 flex gap-0.5 p-1 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-800 shadow-lg
        sm:left-2 sm:top-1/2 sm:-translate-y-1/2 sm:flex-col
        top-2 left-1/2 -translate-x-1/2 flex-row"
    >
      {TOOLS.map(({ key, label, icon }) => {
        const isActive = activeTool === key;
        return (
          <button
            key={key}
            onClick={() => onSelectTool(isActive ? null : key)}
            className={`
              flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded-md transition-colors
              sm:w-auto sm:px-2
              ${isActive
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-gray-200 border border-transparent hover:border-gray-700"
              }
            `}
            title={label}
          >
            <span className="shrink-0">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}

      {drawingCount > 0 && (
        <div className="w-px h-4 bg-gray-700/50 mx-0.5 self-center sm:w-auto sm:h-px sm:mx-0 sm:my-0.5 sm:self-stretch" />

      )}

      {drawingCount > 0 && (
        <button
          onClick={onClearAll}
          className="flex items-center justify-center px-1.5 py-1 text-[10px] font-medium rounded-md transition-colors text-gray-400 hover:text-red-400 border border-transparent hover:border-red-500/30"
          title="Clear drawings"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="11" y2="11" />
            <line x1="11" y1="3" x2="3" y2="11" />
          </svg>
          <span className="hidden sm:inline ml-1">Clear</span>
        </button>
      )}
    </div>
  );
}
