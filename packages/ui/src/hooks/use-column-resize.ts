'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_COLUMN_WIDTH = 60;
const STORAGE_PREFIX = 'table-col-widths-';

/**
 * A global hook for resizable table columns with localStorage persistence.
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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      if (typeof window === 'undefined') return defaultWidths;
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`);
      if (saved) {
        try {
          return { ...defaultWidths, ...JSON.parse(saved) };
        } catch {
          return defaultWidths;
        }
      }
      return defaultWidths;
    },
  );

  // Persist widths to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      `${STORAGE_PREFIX}${tableKey}`,
      JSON.stringify(columnWidths),
    );
  }, [tableKey, columnWidths]);

  const resizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = useCallback(
    (
      columnId: string,
      e: React.MouseEvent<HTMLElement>,
      currentWidth: number,
    ) => {
      e.preventDefault();
      e.stopPropagation();

      resizingRef.current = {
        columnId,
        startX: e.clientX,
        startWidth: currentWidth,
      };

      // Apply cursor globally so it stays col-resize even if mouse moves fast
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = moveEvent.clientX - resizingRef.current.startX;
        const newWidth = Math.max(
          MIN_COLUMN_WIDTH,
          resizingRef.current.startWidth + delta,
        );
        setColumnWidths((prev) => ({
          ...prev,
          [resizingRef.current!.columnId]: newWidth,
        }));
      };

      const onMouseUp = () => {
        resizingRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [],
  );

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
   */
  const getResizeHandleProps = useCallback(
    (columnId: string, fallbackWidth?: number) => ({
      onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
        // Read actual DOM width so we have the current rendered width
        const thEl = (e.currentTarget as HTMLElement).closest('th');
        const currentWidth =
          columnWidths[columnId] ??
          fallbackWidth ??
          (thEl?.getBoundingClientRect().width ?? 120);
        startResize(columnId, e, currentWidth);
      },
    }),
    [columnWidths, startResize],
  );

  /** Reset all widths back to defaults and clear localStorage entry */
  const resetWidths = useCallback(() => {
    setColumnWidths(defaultWidths);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_PREFIX}${tableKey}`);
    }
  }, [defaultWidths, tableKey]);

  return { columnWidths, getHeaderProps, getResizeHandleProps, resetWidths };
}
