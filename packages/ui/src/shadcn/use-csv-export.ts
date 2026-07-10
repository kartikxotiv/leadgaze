'use client';

import { useCallback } from 'react';

import { stringifyCsv } from './csv-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvExportColumn {
  /** DB / data field key */
  key: string;
  /** Human-readable header label written into the CSV file */
  label: string;
}

export interface UseCsvExportOptions<T extends Record<string, unknown>> {
  /** Base filename (without extension). A date suffix will be appended. */
  filename: string;
  /** Ordered list of columns — defines both the CSV header row and value order. */
  columns: CsvExportColumn[];
  /**
   * Called lazily at export time. Return the rows you want to export.
   * For "Export Selected" pass only the selected rows; for "Export All" pass
   * all rows (which may come from a fresh API call).
   */
  getRows: () => T[] | Promise<T[]>;
  /**
   * Maps a single data row to a flat `{ [colKey]: string }` object.
   * The hook uses `columns[i].key` to extract values in order, so every key
   * present in `columns` should be present here (missing keys become empty).
   */
  serializeRow: (row: T) => Record<string, string>;
}

export interface UseCsvExportReturn {
  /** Trigger the CSV download. Returns a Promise so callers can await it. */
  exportToCsv: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Generic, reusable hook that serialises an array of rows into a CSV file
 * and triggers a browser download.
 *
 * @example
 * const { exportToCsv } = useCsvExport({
 *   filename: 'leads_export',
 *   columns: EXPORT_COLUMNS,
 *   getRows: () => paginatedLeads,
 *   serializeRow: serializeLeadRow,
 * });
 */
export function useCsvExport<T extends Record<string, unknown>>(
  options: UseCsvExportOptions<T>,
): UseCsvExportReturn {
  const { filename, columns, getRows, serializeRow } = options;

  const exportToCsv = useCallback(async () => {
    // 1. Resolve rows (may be async)
    const rows = await getRows();

    // 2. Build header row from column labels
    const headerRow = columns.map((c) => c.label);

    // 3. Build data rows — each column key maps to its serialised value
    const dataRows = rows.map((row) => {
      const flat = serializeRow(row);
      return columns.map((c) => flat[c.key] ?? '');
    });

    // 4. Serialise to CSV text
    const csvText = stringifyCsv([headerRow, ...dataRows]);

    // 5. Trigger download via a temporary anchor element
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const dateSuffix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}_${dateSuffix}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke the object URL after a short delay to allow the download to start
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [filename, columns, getRows, serializeRow]);

  return { exportToCsv };
}
