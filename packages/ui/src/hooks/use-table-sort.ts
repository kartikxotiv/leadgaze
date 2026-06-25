'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc' | null;

export interface TableSortState {
  column: string | null;
  direction: SortDirection;
}

export interface UseTableSortOptions {
  /**
   * 'client' (default): data is sorted in-memory — good for Phase 1.
   * 'server': the hook exposes sortColumn/sortDirection but does NOT re-sort
   *           the data array. Forward sortColumn + sortDirection into your
   *           React Query key and API service call instead.
   *
   * Switching from 'client' to 'server' later requires only two tiny changes:
   *   1. Set mode: 'server' here.
   *   2. Add sortState to your queryKey and pass it to the API.
   *   Everything else (icons, active state, component API) stays identical.
   */
  mode?: 'client' | 'server';
  /** Initial sort column (optional) */
  defaultSortColumn?: string;
  /** Initial sort direction (defaults to 'asc') */
  defaultSortDirection?: 'asc' | 'desc';
  /**
   * Called whenever the sort state changes.
   * Use this to reset pagination: onSortChange={() => setCurrentPage(1)}
   */
  onSortChange?: () => void;
  /**
   * Persist the last-used sort preference to localStorage (default: true).
   * Set to false for tables where sort state should not survive a page refresh.
   */
  persistSort?: boolean;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_PREFIX = 'table-sort-';

function readStorage(key: string): TableSortState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as TableSortState) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, state: TableSortState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(state));
  } catch {
    // Quota exceeded or private browsing — silently ignore.
  }
}

// ─── Value extractor (supports dot-notation for nested fields) ────────────────
// e.g. getNestedValue(lead, 'status.status_name') → lead.status.status_name

function getNestedValue(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce((acc: any, key) => acc?.[key], obj);
}

// ─── Generic comparator ───────────────────────────────────────────────────────

function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  // Null / undefined always sink to the bottom regardless of direction
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  let result: number;

  if (typeof a === 'number' && typeof b === 'number') {
    result = a - b;
  } else {
    // Locale-aware natural sort — handles names, ISO dates, and mixed strings
    result = String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  return dir === 'asc' ? result : -result;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Global table-sorting hook. Works with any typed data array.
 *
 * Phase 1 (frontend-only):
 *   const { sortColumn, sortDirection, toggleSort, sortedData } =
 *     useTableSort('leads', filteredLeads, { onSortChange: () => setCurrentPage(1) });
 *   // Use sortedData in the table instead of filteredLeads.
 *
 * Phase 2 (server sort, later):
 *   1. Set mode: 'server'
 *   2. Add sortState to queryKey: [..., sortState]
 *   3. Pass sortColumn + sortDirection to the API service.
 *   Nothing else changes — icons, active state, and component calls stay the same.
 */
export function useTableSort<T extends Record<string, any>>(
  tableKey: string,
  data: T[],
  options: UseTableSortOptions = {},
) {
  const {
    mode = 'client',
    defaultSortColumn = null,
    defaultSortDirection = 'asc',
    onSortChange,
    persistSort = false,
  } = options;

  // Keep onSortChange in a ref so toggleSort never closes over a stale value
  const onSortChangeRef = useRef(onSortChange);
  useEffect(() => {
    onSortChangeRef.current = onSortChange;
  });

  // ── Initial state: hydrate from localStorage (when persistSort is on) ──────
  const [sortState, setSortState] = useState<TableSortState>(() => {
    if (persistSort) {
      const saved = readStorage(tableKey);
      if (saved) return saved;
    }
    return {
      column: defaultSortColumn,
      direction: defaultSortColumn ? defaultSortDirection : null,
    };
  });

  // ── Persist to localStorage whenever sort changes ──────────────────────────
  useEffect(() => {
    if (!persistSort) return;
    writeStorage(tableKey, sortState);
  }, [tableKey, sortState, persistSort]);

  // ── Toggle sort: click 1 → asc, click 2 → desc, click 3 → clear ───────────
  const toggleSort = useCallback((columnKey: string) => {
    setSortState((prev) => {
      if (prev.column !== columnKey) {
        return { column: columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnKey, direction: 'desc' };
      }
      // Third click: clear sort
      return { column: null, direction: null };
    });
    onSortChangeRef.current?.();
  }, []);

  // ── Programmatically clear sort ───────────────────────────────────────────
  const clearSort = useCallback(() => {
    setSortState({ column: null, direction: null });
    onSortChangeRef.current?.();
  }, []);

  // ── Client-side sorted data ───────────────────────────────────────────────
  const sortedData = useMemo<T[]>(() => {
    if (mode === 'server') return data;
    if (!sortState.column || !sortState.direction) return data;

    const col = sortState.column;
    const dir = sortState.direction;

    return [...data].sort((a, b) =>
      compareValues(getNestedValue(a, col), getNestedValue(b, col), dir),
    );
  }, [data, sortState, mode]);

  return {
    /** Active sort column key (the key passed to toggleSort), or null */
    sortColumn: sortState.column,
    /** Active sort direction, or null when unsorted */
    sortDirection: sortState.direction,
    /**
     * Toggle sort for a column. Pass the data-field key (supports dot-notation).
     * e.g. toggleSort('status.status_name')
     * Cycles: asc → desc → clear → asc
     */
    toggleSort,
    /** Programmatically reset sort to unsorted state */
    clearSort,
    /**
     * 'client' mode: sorted copy of `data`.
     * 'server' mode: `data` unchanged — the API handles ordering.
     */
    sortedData,
    /**
     * Full sort state object. Spread into React Query `queryKey` when
     * switching to server-side sorting:
     *   queryKey: ['leads', workspace.id, currentPage, sortState, ...]
     */
    sortState,
  };
}
