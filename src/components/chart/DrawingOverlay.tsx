"use client";

import { useEffect, useMemo, useRef } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { Drawing, DragTarget } from "./useDrawingTools";

interface Props {
  readonly drawings: readonly Drawing[];
  readonly selectedId: string | null;
  readonly chartRef: React.RefObject<IChartApi | null>;
  readonly candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
  readonly version: number;
  readonly onStartDrag: (drawingId: string, target: DragTarget, mouseX: number, mouseY: number) => void;
  readonly onUpdateDrag: (mouseX: number, mouseY: number) => void;
  readonly onEndDrag: () => void;
  readonly onSelect: (id: string | null) => void;
  readonly contextMenu: { x: number; y: number } | null;
  readonly onDeleteSelected: () => void;
  readonly onDismissContextMenu: () => void;
}

const HANDLE_SIZE = 8;
const HIT_SIZE = 18;

interface HitPos {
  drawingId: string;
  cx: number;
  cy: number;
  target: DragTarget;
}

function computePositions(
  drawings: readonly Drawing[],
  selectedId: string | null,
  chart: IChartApi,
  cs: ISeriesApi<"Candlestick">,
): { handles: HitPos[]; hits: HitPos[] } {
  const handles: HitPos[] = [];
  const hits: HitPos[] = [];

  for (const d of drawings) {
    const startY = cs.priceToCoordinate(d.start.price);
    if (startY === null) continue;
    const isSelected = d.id === selectedId;

    if (d.tool === "horizontal_line") {
      const w = chart.chartElement().clientWidth;
      const cx = w / 2;
      if (isSelected) handles.push({ drawingId: d.id, cx, cy: startY, target: { kind: "vertical" } });
      hits.push({ drawingId: d.id, cx, cy: startY, target: { kind: "vertical" } });
      continue;
    }

    if (d.tool === "horizontal_ray") {
      const startX = chart.timeScale().timeToCoordinate(d.start.time);
      if (startX === null) continue;
      if (isSelected) handles.push({ drawingId: d.id, cx: startX, cy: startY, target: { kind: "vertical" } });
      hits.push({ drawingId: d.id, cx: startX, cy: startY, target: { kind: "vertical" } });
      continue;
    }

    if (d.tool === "trend_line" && d.end) {
      const startX = chart.timeScale().timeToCoordinate(d.start.time);
      const endX = chart.timeScale().timeToCoordinate(d.end.time);
      const endY = cs.priceToCoordinate(d.end.price);
      if (startX === null || endX === null || endY === null) continue;

      if (isSelected) {
        handles.push({ drawingId: d.id, cx: startX, cy: startY, target: { kind: "start_point" } });
        handles.push({
          drawingId: d.id,
          cx: (startX + endX) / 2,
          cy: (startY + endY) / 2,
          target: { kind: "translate" },
        });
        handles.push({ drawingId: d.id, cx: endX, cy: endY, target: { kind: "end_point" } });
      }

      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        const cx = startX + (endX - startX) * t;
        const cy = startY + (endY - startY) * t;
        const target: DragTarget =
          i === 0 ? { kind: "start_point" } :
          i === 4 ? { kind: "end_point" } :
          { kind: "translate" };
        hits.push({ drawingId: d.id, cx, cy, target });
      }
    }
  }

  return { handles, hits };
}

export function DrawingOverlay({
  drawings,
  selectedId,
  chartRef,
  candleSeriesRef,
  version,
  onStartDrag,
  onUpdateDrag,
  onEndDrag,
  onSelect,
  contextMenu,
  onDeleteSelected,
  onDismissContextMenu,
}: Props) {
  const activeDragRef = useRef<{ drawingId: string; target: DragTarget } | null>(null);

  // Window-level mousemove / mouseup for drag
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!activeDragRef.current) return;
      const rect = chartRef.current?.chartElement().getBoundingClientRect();
      if (!rect) return;
      onUpdateDrag(e.clientX - rect.left, e.clientY - rect.top);
    }
    function onMouseUp() {
      if (!activeDragRef.current) return;
      activeDragRef.current = null;
      onEndDrag();
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onUpdateDrag, onEndDrag, chartRef]);

  function handleHitMouseDown(e: React.MouseEvent, hit: HitPos) {
    if (e.button !== 0) return; // left-click only for drag
    e.preventDefault();
    e.stopPropagation();
    onSelect(hit.drawingId);
    const rect = chartRef.current?.chartElement().getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    activeDragRef.current = { drawingId: hit.drawingId, target: hit.target };
    onStartDrag(hit.drawingId, hit.target, mx, my);
  }

  const positions = useMemo(() => {
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return { handles: [] as HitPos[], hits: [] as HitPos[] };
    return computePositions(drawings, selectedId, chart, cs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawings, selectedId, chartRef.current, candleSeriesRef.current, version]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Hit zones — invisible, pointer-events auto */}
      {positions.hits.map((h) => (
        <div
          key={`hit_${h.drawingId}_${h.target.kind}_${h.cx.toFixed(0)}_${h.cy.toFixed(0)}`}
          onMouseDown={(e) => handleHitMouseDown(e, h)}
          style={{
            position: "absolute",
            left: h.cx - HIT_SIZE / 2,
            top: h.cy - HIT_SIZE / 2,
            width: HIT_SIZE,
            height: HIT_SIZE,
            borderRadius: "50%",
            cursor: "grab",
            pointerEvents: "auto",
          }}
        />
      ))}

      {/* Visible handles for selected drawing */}
      {positions.handles.map((h) => (
        <div
          key={`h_${h.drawingId}_${h.target.kind}`}
          onMouseDown={(e) => handleHitMouseDown(e, h)}
          style={{
            position: "absolute",
            left: h.cx - HANDLE_SIZE / 2,
            top: h.cy - HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            borderRadius: "50%",
            border: "2px solid white",
            backgroundColor: "#22d3ee",
            boxShadow: "0 0 4px rgba(0,0,0,0.6)",
            cursor: "grab",
            pointerEvents: "auto",
            zIndex: 25,
          }}
        />
      ))}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y, pointerEvents: "auto" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onDeleteSelected()}
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-gray-800 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
