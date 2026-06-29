'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { ColumnPreference } from '~/lib/hooks/use-dynamic-columns';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';

interface UseLeadsColumnPreferencesOptions {
  entityType: string;
  workspaceId?: string;
  userId?: string;
  defaultVisibility: Record<string, boolean>;
  enabled?: boolean;
}

/**
 * Merges DB-backed column preferences with local visibility state.
 * DB is source of truth for visibleColumns / columnOrder / columnWidths when present.
 */
export function useLeadsColumnPreferences({
  entityType,
  workspaceId,
  userId,
  defaultVisibility,
  enabled = true,
}: UseLeadsColumnPreferencesOptions) {
  const { preferences, updatePreferences, isLoading } = useDynamicColumns({
    entityType,
    workspaceId,
    userId,
    enabled,
  });

  const mergedDefaults = useMemo(() => {
    if (!preferences?.visibleColumns?.length) {
      return defaultVisibility;
    }
    const fromDb: Record<string, boolean> = { ...defaultVisibility };
    for (const key of Object.keys(fromDb)) {
      fromDb[key] = preferences.visibleColumns.includes(key);
    }
    return fromDb;
  }, [preferences, defaultVisibility]);

  const persistVisibility = useCallback(
    (visibility: Record<string, boolean>) => {
      if (!workspaceId || !userId) return;
      const visibleColumns = Object.entries(visibility)
        .filter(([, v]) => v !== false)
        .map(([k]) => k);
      // Avoid no-op writes: only persist when visibleColumns actually changed
      const current = preferences?.visibleColumns || [];
      const asSet = new Set(visibleColumns);
      const currentSet = new Set(current);
      if (
        asSet.size === currentSet.size &&
        [...asSet].every((v) => currentSet.has(v))
      ) {
        return;
      }

      updatePreferences.mutate({ visibleColumns });
    },
    [workspaceId, userId, updatePreferences],
  );

  const persistWidths = useCallback(
    (columnWidths: Record<string, number>) => {
      if (!workspaceId || !userId) return;
      // Avoid no-op writes: only persist when widths changed
      const currentWidths = preferences?.columnWidths || {};
      const keys = new Set([
        ...Object.keys(currentWidths),
        ...Object.keys(columnWidths),
      ]);
      let changed = false;
      for (const k of keys) {
        if ((currentWidths as any)[k] !== (columnWidths as any)[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;

      updatePreferences.mutate({ columnWidths });
    },
    [workspaceId, userId, updatePreferences],
  );

  return {
    preferences: preferences as ColumnPreference | null,
    mergedDefaults,
    isLoading,
    persistVisibility,
    persistWidths,
  };
}

/**
 * Hook to debounce-sync column visibility changes to DB preferences.
 */
export function useSyncColumnVisibilityToDb(
  visibility: Record<string, boolean>,
  persist: (v: Record<string, boolean>) => void,
  enabled: boolean,
) {
  const isFirst = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const timer = setTimeout(() => persist(visibility), 500);
    return () => clearTimeout(timer);
  }, [visibility, persist, enabled]);
}
