"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IChartApi, IPriceLine, ISeriesApi, MouseEventParams, Time, UTCTimestamp } from "lightweight-charts";
import { LineSeries, LineStyle } from "lightweight-charts";
import type { ChartDataPoint } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────

export type DrawTool = "horizontal_ray" | "horizontal_line" | "trend_line";

export interface DrawingPoint {
  time: UTCTimestamp;
  price: number;
}

export interface Drawing {
  id: string;
  tool: DrawTool;
  start: DrawingPoint;
  end?: DrawingPoint;
}

export type DragTarget =
  | { kind: "vertical" }       // horizontal line/ray — vertical move
  | { kind: "start_point" }    // trend line — drag start endpoint
  | { kind: "end_point" }      // trend line — drag end endpoint
  | { kind: "translate" };     // trend line — move both endpoints

// ── Constants ────────────────────────────────────────────────────────

const DRAW_COLORS: Record<DrawTool, string> = {
  horizontal_ray: "#a78bfa",
  horizontal_line: "#fbbf24",
  trend_line: "#22d3ee",
};

const DRAW_STYLES: Record<DrawTool, LineStyle> = {
  horizontal_ray: LineStyle.Solid,
  horizontal_line: LineStyle.Solid,
  trend_line: LineStyle.Solid,
};

const HIT_RADIUS = 14; // px tolerance for line hit-test

let idCounter = 0;
function uid() {
  return `d_${++idCounter}`;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useDrawingTools() {
  // ── State ──────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<DrawTool | null>(null);
  const activeToolRef = useRef<DrawTool | null>(null);
  activeToolRef.current = activeTool;

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const drawingsRef = useRef<Drawing[]>([]);
  drawingsRef.current = drawings;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // ── Chart refs (assigned by attachChart) ───────────────────────
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const dataRef = useRef<ChartDataPoint[]>([]);

  // ── Drag state (ref — no re-renders during drag) ───────────────
  const dragRef = useRef<{
    drawingId: string;
    target: DragTarget;
    startMouseX: number;
    startMouseY: number;
    origStart: DrawingPoint;
    origEnd?: DrawingPoint;
  } | null>(null);

  const hasDraggedRef = useRef(false);

  // ── Rendered object map (drawingId → LW object) ────────────────
  const renderedMapRef = useRef<Map<string, IPriceLine | ISeriesApi<"Line">>>(new Map());

  // ── Trend line pending first click ─────────────────────────────
  const pendingStartRef = useRef<DrawingPoint | null>(null);
  const previewSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const crosshairHandlerRef = useRef<((p: MouseEventParams<Time>) => void) | null>(null);

  // ── Rendering ──────────────────────────────────────────────────

  const cleanupRendered = useCallback(() => {
    for (const [id, obj] of renderedMapRef.current) {
      if ("setData" in (obj as any)) {
        try { chartRef.current?.removeSeries(obj as ISeriesApi<"Line">); } catch { /* ok */ }
      } else {
        try { candleSeriesRef.current?.removePriceLine(obj as IPriceLine); } catch { /* ok */ }
      }
    }
    renderedMapRef.current.clear();
  }, []);

  const renderDrawing = useCallback((d: Drawing) => {
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return;

    if (d.tool === "horizontal_line") {
      const pl = cs.createPriceLine({
        price: d.start.price,
        color: DRAW_COLORS.horizontal_line,
        lineWidth: 1,
        lineStyle: DRAW_STYLES.horizontal_line,
        axisLabelVisible: true,
        title: d.start.price.toFixed(2),
      });
      renderedMapRef.current.set(d.id, pl);
      return;
    }

    if (d.tool === "horizontal_ray") {
      const data = dataRef.current;
      if (data.length === 0) return;
      const last = data[data.length - 1];
      const lastTime = Math.floor(last.timestamp / 1000) as UTCTimestamp;
      const ls = chart.addSeries(LineSeries, {
        color: DRAW_COLORS.horizontal_ray,
        lineWidth: 1,
        lineStyle: DRAW_STYLES.horizontal_ray,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      ls.setData([
        { time: d.start.time, value: d.start.price },
        { time: lastTime, value: d.start.price },
      ]);
      renderedMapRef.current.set(d.id, ls);
      return;
    }

    if (d.tool === "trend_line" && d.end) {
      const ls = chart.addSeries(LineSeries, {
        color: DRAW_COLORS.trend_line,
        lineWidth: 1,
        lineStyle: DRAW_STYLES.trend_line,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      ls.setData([
        { time: d.start.time, value: d.start.price },
        { time: d.end.time, value: d.end.price },
      ]);
      renderedMapRef.current.set(d.id, ls);
    }
  }, []);

  const renderAllDrawings = useCallback(() => {
    cleanupRendered();
    for (const d of drawingsRef.current) {
      renderDrawing(d);
    }
  }, [cleanupRendered, renderDrawing]);

  const updateDrawingInPlace = useCallback((d: Drawing) => {
    const obj = renderedMapRef.current.get(d.id);
    if (!obj) { renderDrawing(d); return; }

    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return;

    if (d.tool === "horizontal_line") {
      (obj as IPriceLine).applyOptions({ price: d.start.price, title: d.start.price.toFixed(2) });
      return;
    }

    if (d.tool === "horizontal_ray") {
      const data = dataRef.current;
      const lastTime = data.length > 0
        ? Math.floor(data[data.length - 1].timestamp / 1000) as UTCTimestamp
        : d.start.time;
      (obj as ISeriesApi<"Line">).setData([
        { time: d.start.time, value: d.start.price },
        { time: lastTime, value: d.start.price },
      ]);
      return;
    }

    if (d.tool === "trend_line" && d.end) {
      (obj as ISeriesApi<"Line">).setData([
        { time: d.start.time, value: d.start.price },
        { time: d.end.time, value: d.end.price },
      ]);
    }
  }, [renderDrawing]);

  // ── Hit testing ───────────────────────────────────────────────

  const hitTestDrawing = useCallback((px: number, py: number): string | null => {
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return null;

    // Check in reverse order (topmost drawing first)
    const ds = drawingsRef.current;
    for (let i = ds.length - 1; i >= 0; i--) {
      const d = ds[i];
      const startY = cs.priceToCoordinate(d.start.price);
      if (startY === null) continue;

      if (d.tool === "horizontal_line") {
        if (Math.abs(py - startY) <= HIT_RADIUS) return d.id;
        continue;
      }

      if (d.tool === "horizontal_ray") {
        const startX = chart.timeScale().timeToCoordinate(d.start.time);
        if (startX === null) continue;
        if (px >= startX - HIT_RADIUS && Math.abs(py - startY) <= HIT_RADIUS) return d.id;
        continue;
      }

      if (d.tool === "trend_line" && d.end) {
        const startX = chart.timeScale().timeToCoordinate(d.start.time);
        const endX = chart.timeScale().timeToCoordinate(d.end.time);
        const endY = cs.priceToCoordinate(d.end.price);
        if (startX === null || endX === null || endY === null) continue;

        const dx = endX - startX;
        const dy = endY - startY;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) {
          if (Math.hypot(px - startX, py - startY) <= HIT_RADIUS) return d.id;
          continue;
        }
        let t = ((px - startX) * dx + (py - startY) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const nearX = startX + t * dx;
        const nearY = startY + t * dy;
        if (Math.hypot(px - nearX, py - nearY) <= HIT_RADIUS) return d.id;
      }
    }
    return null;
  }, []);

  // ── Selection ─────────────────────────────────────────────────

  const selectDrawing = useCallback((id: string | null) => {
    setSelectedId(id);
    selectedIdRef.current = id;
  }, []);

  const deselectDrawing = useCallback(() => {
    selectDrawing(null);
  }, [selectDrawing]);

  // ── Delete ─────────────────────────────────────────────────────

  const deleteDrawing = useCallback((id: string) => {
    // Remove rendered object
    const obj = renderedMapRef.current.get(id);
    if (obj) {
      if (obj && typeof obj === "object" && "applyOptions" in (obj as IPriceLine)) {
        try { candleSeriesRef.current?.removePriceLine(obj as IPriceLine); } catch { /* ok */ }
      } else {
        try { chartRef.current?.removeSeries(obj as ISeriesApi<"Line">); } catch { /* ok */ }
      }
      renderedMapRef.current.delete(id);
    }
    if (selectedIdRef.current === id) {
      selectDrawing(null);
    }
    setDrawings(prev => prev.filter(d => d.id !== id));
    setContextMenu(null);
  }, [selectDrawing]);

  // ── Cancel pending tool ────────────────────────────────────────

  const cancelPending = useCallback(() => {
    setActiveTool(null);
    pendingStartRef.current = null;

    if (previewSeriesRef.current) {
      try { chartRef.current?.removeSeries(previewSeriesRef.current); } catch { /* ok */ }
      previewSeriesRef.current = null;
    }

    if (crosshairHandlerRef.current && chartRef.current) {
      try { chartRef.current.unsubscribeCrosshairMove(crosshairHandlerRef.current); } catch { /* ok */ }
      crosshairHandlerRef.current = null;
    }
  }, []);

  // ── Tool selection ─────────────────────────────────────────────

  const selectTool = useCallback((tool: DrawTool | null) => {
    cancelPending();
    if (tool) setActiveTool(tool);
    deselectDrawing();
  }, [cancelPending, deselectDrawing]);

  // ── Click handler (chart subscription) ─────────────────────────

  const handleClick = useCallback((param: MouseEventParams<Time>) => {
    setContextMenu(null);

    // Ignore click if just finished a drag
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    const tool = activeToolRef.current;
    if (!param.point || !param.time) return;
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return;

    // If tool active → place drawing
    if (tool) {
      const price = cs.coordinateToPrice(param.point.y);
      if (price === null) return;
      const point: DrawingPoint = { time: param.time as UTCTimestamp, price };

      if (tool === "horizontal_line" || tool === "horizontal_ray") {
        const d: Drawing = { id: uid(), tool, start: point };
        setDrawings(prev => [...prev, d]);
        renderDrawing(d);
        setActiveTool(null);
        selectDrawing(d.id);
        return;
      }

      if (tool === "trend_line") {
        if (!pendingStartRef.current) {
          pendingStartRef.current = point;
          const crosshairHandler = (p: MouseEventParams<Time>) => {
            const start = pendingStartRef.current;
            if (!start) return;
            if (!p.time || !p.point) {
              previewSeriesRef.current?.setData([]);
              return;
            }
            const previewPrice = cs.coordinateToPrice(p.point.y);
            if (previewPrice === null) return;
            let preview = previewSeriesRef.current;
            if (!preview) {
              preview = chart.addSeries(LineSeries, {
                color: DRAW_COLORS.trend_line,
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                lastValueVisible: false,
                priceLineVisible: false,
              });
              previewSeriesRef.current = preview;
            }
            preview.setData([
              { time: start.time, value: start.price },
              { time: p.time as UTCTimestamp, value: previewPrice },
            ]);
          };
          chart.subscribeCrosshairMove(crosshairHandler);
          crosshairHandlerRef.current = crosshairHandler;
        } else {
          const d: Drawing = {
            id: uid(),
            tool,
            start: pendingStartRef.current,
            end: point,
          };
          pendingStartRef.current = null;
          if (crosshairHandlerRef.current) {
            try { chart.unsubscribeCrosshairMove(crosshairHandlerRef.current); } catch { /* ok */ }
            crosshairHandlerRef.current = null;
          }
          if (previewSeriesRef.current) {
            try { chart.removeSeries(previewSeriesRef.current); } catch { /* ok */ }
            previewSeriesRef.current = null;
          }
          setDrawings(prev => [...prev, d]);
          renderDrawing(d);
          setActiveTool(null);
          selectDrawing(d.id);
        }
        return;
      }
    }

    // No tool active → check selection
    const hitId = hitTestDrawing(param.point.x, param.point.y);
    selectDrawing(hitId);
  }, [renderDrawing, selectDrawing, hitTestDrawing]);

  // ── Drag system ────────────────────────────────────────────────

  const startDrag = useCallback((
    drawingId: string,
    target: DragTarget,
    mouseX: number,
    mouseY: number,
  ) => {
    const d = drawingsRef.current.find(dd => dd.id === drawingId);
    if (!d) return;
    hasDraggedRef.current = false;
    dragRef.current = {
      drawingId,
      target,
      startMouseX: mouseX,
      startMouseY: mouseY,
      origStart: { ...d.start },
      origEnd: d.end ? { ...d.end } : undefined,
    };
  }, []);

  const updateDrag = useCallback((mouseX: number, mouseY: number) => {
    const dr = dragRef.current;
    if (!dr) return;
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return;

    hasDraggedRef.current = true;

    const target = dr.target;

    if (target.kind === "vertical") {
      // Horizontal line or ray — update price only
      const newPrice = cs.coordinateToPrice(mouseY);
      if (newPrice === null) return;
      setDrawings(prev => prev.map(d => {
        if (d.id !== dr.drawingId) return d;
        const updated: Drawing = { ...d, start: { ...d.start, price: newPrice } };
        updateDrawingInPlace(updated);
        return updated;
      }));
      return;
    }

    if (target.kind === "start_point") {
      const newTime = chart.timeScale().coordinateToTime(mouseX) as UTCTimestamp | null;
      const newPrice = cs.coordinateToPrice(mouseY);
      if (!newTime || newPrice === null) return;
      setDrawings(prev => prev.map(d => {
        if (d.id !== dr.drawingId) return d;
        const updated: Drawing = { ...d, start: { time: newTime, price: newPrice } };
        updateDrawingInPlace(updated);
        return updated;
      }));
      return;
    }

    if (target.kind === "end_point") {
      const newTime = chart.timeScale().coordinateToTime(mouseX) as UTCTimestamp | null;
      const newPrice = cs.coordinateToPrice(mouseY);
      if (!newTime || newPrice === null) return;
      setDrawings(prev => prev.map(d => {
        if (d.id !== dr.drawingId || !d.end) return d;
        const updated: Drawing = { ...d, end: { time: newTime, price: newPrice } };
        updateDrawingInPlace(updated);
        return updated;
      }));
      return;
    }

    if (target.kind === "translate") {
      const dx = mouseX - dr.startMouseX;
      const dy = mouseY - dr.startMouseY;

      const origStartX = chart.timeScale().timeToCoordinate(dr.origStart.time);
      const origStartY = cs.priceToCoordinate(dr.origStart.price);
      if (origStartX === null || origStartY === null) return;

      const newStartTime = chart.timeScale().coordinateToTime(origStartX + dx) as UTCTimestamp | null;
      const newStartPrice = cs.coordinateToPrice(origStartY + dy);
      if (!newStartTime || newStartPrice === null) return;

      let newEnd: DrawingPoint | undefined;
      if (dr.origEnd) {
        const origEndX = chart.timeScale().timeToCoordinate(dr.origEnd.time);
        const origEndY = cs.priceToCoordinate(dr.origEnd.price);
        if (origEndX !== null && origEndY !== null) {
          const net = chart.timeScale().coordinateToTime(origEndX + dx) as UTCTimestamp | null;
          const nep = cs.coordinateToPrice(origEndY + dy);
          if (net && nep !== null) {
            newEnd = { time: net, price: nep };
          }
        }
      }

      setDrawings(prev => prev.map(d => {
        if (d.id !== dr.drawingId) return d;
        const updated: Drawing = {
          ...d,
          start: { time: newStartTime, price: newStartPrice },
          end: newEnd,
        };
        updateDrawingInPlace(updated);
        return updated;
      }));
      return;
    }
  }, [updateDrawingInPlace]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Right-click → context menu ────────────────────────────────

  const handleContextMenu = useCallback((e: MouseEvent) => {
    const chart = chartRef.current;
    const cs = candleSeriesRef.current;
    if (!chart || !cs) return;

    const rect = chart.chartElement().getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const hitId = hitTestDrawing(px, py);
    if (hitId) {
      e.preventDefault();
      selectDrawing(hitId);
      setContextMenu({ x: e.clientX, y: e.clientY });
    } else {
      setContextMenu(null);
    }
  }, [hitTestDrawing, selectDrawing]);

  const dismissContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ── ESC → cancel tool / deselect ──────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (contextMenu) { setContextMenu(null); return; }
        if (activeToolRef.current) { cancelPending(); return; }
        deselectDrawing();
      }
      // Delete key → remove selected drawing
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
        // Don't delete if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        deleteDrawing(selectedIdRef.current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelPending, deselectDrawing, deleteDrawing, contextMenu]);

  // ── Lifecycle ─────────────────────────────────────────────────

  const attachChart = useCallback((
    chart: IChartApi,
    candleSeries: ISeriesApi<"Candlestick">,
    data: ChartDataPoint[],
  ) => {
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    dataRef.current = data;
    renderAllDrawings();
  }, [renderAllDrawings]);

  const detachChart = useCallback(() => {
    cancelPending();
    cleanupRendered();
    chartRef.current = null;
    candleSeriesRef.current = null;
    dataRef.current = [];
  }, [cancelPending, cleanupRendered]);

  // ── Clear all ─────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    cleanupRendered();
    setDrawings([]);
    selectDrawing(null);
  }, [cleanupRendered, selectDrawing]);

  // ── Return ────────────────────────────────────────────────────

  return {
    activeTool,
    selectTool,
    cancelPending,
    handleClick,
    attachChart,
    detachChart,
    clearAll,
    drawings,
    selectedId,
    selectDrawing,
    deselectDrawing,
    deleteDrawing,
    startDrag,
    updateDrag,
    endDrag,
    hitTestDrawing,
    contextMenu,
    handleContextMenu,
    dismissContextMenu,
    chartRef,
    candleSeriesRef,
  } as const;
}
