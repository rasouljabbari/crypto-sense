"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { IndicatorManager } from "./IndicatorManager";
import type { IndicatorId } from "./types";

// ─── Hook: useIndicatorManager ─────────────────────────────────────────────
// Wraps IndicatorManager with React state synchronization.
// Returns stable references; re-renders only on indicator state changes.

export function useIndicatorManager() {
  const manager = useMemo(() => new IndicatorManager(), []);

  // Force re-render when manager state changes
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    return manager.subscribe(() => forceUpdate());
  }, [manager]);

  const toggle = useCallback(
    (id: IndicatorId) => {
      manager.toggle(id);
    },
    [manager]
  );

  const isEnabled = useCallback(
    (id: IndicatorId) => manager.isEnabled(id),
    [manager, forceUpdate] // forceUpdate ensures fresh check after re-render
  );

  const getVisibleIds = useCallback(
    () => manager.getVisibleIds(),
    [manager, forceUpdate]
  );

  const getAll = useCallback(
    () => manager.getAll(),
    [manager, forceUpdate]
  );

  return useMemo(
    () => ({
      manager,
      toggle,
      isEnabled,
      getVisibleIds,
      getAll,
    }),
    [manager, toggle, isEnabled, getVisibleIds, getAll]
  );
}
