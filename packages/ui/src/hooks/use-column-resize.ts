'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_COLUMN_WIDTH = 60;
const STORAGE_PREFIX = 'table-col-widths-';
/** Delay (ms) before writing to localStorage after the last resize event. */
const PERSIST_DEBOUNCE_MS = 300;

// ─── SSR-safe layout effect ──────────────────────────────────────────────────
// useLayoutEffect on the server prints a warning; fall back to useEffect there.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ─── Helper: read from localStorage safely ───────────────────────────────────
function readStorage(tableKey: string): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`);
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  } catch {
    return null;
  }
}

// ─── Helper: write to localStorage safely ────────────────────────────────────
function writeStorage(tableKey: string, widths: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, JSON.stringify(widths));
  } catch {
    // Quota exceeded or private-browsing restriction — silently ignore.
  }
}

/**
 * A global hook for resizable table columns with localStorage persistence.
 *
 * Improvements over v1:
 *  1. Pointer-event API (works with mouse, touch, and stylus).
 *  2. SSR-safe: server always renders with `defaultWidths`; client hydrates
 *     from localStorage in a layout-effect (no hydration mismatch).
 *  3. Width changes during drag are applied via CSS custom properties on the
 *     <th> DOM node directly — zero React re-renders mid-drag.
 *  4. State (and therefore re-render) only happens once on pointer-up.
 *  5. Debounced localStorage writes — persists only after the drag settles.
 *  6. Event listeners are always cleaned up, even if the component unmounts
 *     mid-drag.
 *  7. `defaultWidths` is captured in a ref so the identity never goes stale.
 *  8. Concurrent resize attempts are safely ignored.
 *
 * Usage:
 *   const { getHeaderProps, getResizeHandleProps } = useColumnResize('leads');
 *
 *   // In <TableHead>:
 *   <TableHead className="relative" {...getHeaderProps('name')}>
 *     Name
 *     <span className="col-resize-handle" {...getResizeHandleProps('name')} />
 *   </TableHead>
 */
export function useColumnResize(
  tableKey: string,
  defaultWidths: Record<string, number> = {},
) {
  // ── 7. Stable defaultWidths ref ─────────────────────────────────────────
  // Keep a ref so callbacks never close over a stale `defaultWidths` object.
  const defaultWidthsRef = useRef<Record<string, number>>(defaultWidths);
  useIsomorphicLayoutEffect(() => {
    defaultWidthsRef.current = defaultWidths;
  });

  // ── 8 / 2. SSR-safe initial state ──────────────────────────────────────
  // On the server (or first client paint) we use `defaultWidths` so the HTML
  // matches. We then hydrate from localStorage in a layout-effect below.
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => defaultWidths,
  );

  // ── 8. Hydrate from localStorage after first paint (client only) ────────
  useIsomorphicLayoutEffect(() => {
    const saved = readStorage(tableKey);
    if (saved) {
      setColumnWidths((prev) => ({ ...prev, ...saved }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]); // re-hydrate if the tableKey ever changes

  // ── 3. Debounced localStorage persistence ───────────────────────────────
  // We write to storage only after the state settles, not on every mouse-move.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    persistTimerRef.current = setTimeout(() => {
      writeStorage(tableKey, columnWidths);
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [tableKey, columnWidths]);

  // ── 4 & 6. Resize state lives entirely in refs during the drag ─────────
  // This avoids a React re-render on every pointermove event.
  const resizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
    thEl: HTMLElement;
    /** Abort flag: set to true on cleanup so stale handlers no-op. */
    aborted: boolean;
  } | null>(null);

  // ── 1 & 5. Pointer-based resize with guaranteed cleanup ─────────────────
  const startResize = useCallback(
    (
      columnId: string,
      e: React.PointerEvent<HTMLElement>,
      thEl: HTMLElement,
      currentWidth: number,
    ) => {
      // ── 6. Prevent concurrent resizes ───────────────────────────────────
      if (resizingRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      // Capture pointer so events continue even if the cursor leaves the handle
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      resizingRef.current = {
        columnId,
        startX: e.clientX,
        startWidth: currentWidth,
        thEl,
        aborted: false,
      };

      // Apply cursor globally so it stays col-resize even if mouse moves fast
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      // ── 4. Direct DOM mutation during drag (no React state) ─────────────
      const onPointerMove = (moveEvent: PointerEvent) => {
        const state = resizingRef.current;
        if (!state || state.aborted) return;

        const delta = moveEvent.clientX - state.startX;
        const newWidth = Math.max(MIN_COLUMN_WIDTH, state.startWidth + delta);

        // Write directly to the DOM — zero re-renders while dragging.
        state.thEl.style.width = `${newWidth}px`;
        state.thEl.style.minWidth = `${newWidth}px`;
      };

      // ── 1. Commit to React state and clean up on pointer-up ─────────────
      const onPointerUp = (upEvent: PointerEvent) => {
        cleanup();

        const state = resizingRef.current;
        if (!state) return;
        resizingRef.current = null;

        const delta = upEvent.clientX - state.startX;
        const finalWidth = Math.max(MIN_COLUMN_WIDTH, state.startWidth + delta);

        // Single state update after drag ends → single re-render.
        setColumnWidths((prev) => ({
          ...prev,
          [state.columnId]: finalWidth,
        }));
      };

      const cleanup = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onCancel);
        if (resizingRef.current) {
          resizingRef.current.aborted = true;
        }
      };

      // Handle pointer cancel (e.g. touch interrupted by OS gesture)
      const onCancel = () => {
        cleanup();
        // Restore the original width on cancel
        if (resizingRef.current) {
          resizingRef.current.thEl.style.width = `${resizingRef.current.startWidth}px`;
          resizingRef.current.thEl.style.minWidth = `${resizingRef.current.startWidth}px`;
          resizingRef.current = null;
        }
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onCancel);

      // ── 1. Unmount-safe: abort via a returned cleanup stored in a ref ───
      // (used by the component-unmount effect below)
      activeCleanupRef.current = cleanup;
    },
    [],
  );

  // ── 1. Cleanup if component unmounts mid-drag ────────────────────────────
  const activeCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      if (activeCleanupRef.current) {
        activeCleanupRef.current();
        activeCleanupRef.current = null;
        resizingRef.current = null;
      }
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Spread onto <TableHead> to apply the persisted width.
   * e.g. <TableHead className="relative" {...getHeaderProps('name')}>
   */
  const getHeaderProps = useCallback(
    (columnId: string, fallbackWidth?: number) => {
      const width = columnWidths[columnId] ?? fallbackWidth;
      return {
        style: width
          ? ({
              width: `${width}px`,
              minWidth: `${width}px`,
            } as React.CSSProperties)
          : undefined,
      };
    },
    [columnWidths],
  );

  /**
   * Spread onto the resize handle <span> inside <TableHead>.
   * e.g. <span className="col-resize-handle" {...getResizeHandleProps('name')} />
   *
   * Supports mouse, touch, and stylus via the Pointer Events API.
   */
  const getResizeHandleProps = useCallback(
    (columnId: string, fallbackWidth?: number) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        // Find the parent <th> to read / mutate its width directly
        const thEl = (e.currentTarget as HTMLElement).closest('th') as HTMLElement | null;
        if (!thEl) return;

        const currentWidth =
          columnWidths[columnId] ??
          fallbackWidth ??
          thEl.getBoundingClientRect().width;

        startResize(columnId, e, thEl, currentWidth);
      },
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
      },
    }),
    [columnWidths, startResize],
  );

  /** Reset all widths back to defaults and clear the localStorage entry. */
  const resetWidths = useCallback(() => {
    setColumnWidths({ ...defaultWidthsRef.current });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_PREFIX}${tableKey}`);
    }
  }, [tableKey]);

  return { columnWidths, getHeaderProps, getResizeHandleProps, resetWidths };
}
