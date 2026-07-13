'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { Badge } from './badge';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from './select';
import { cn } from '../lib/utils';

import {
  type CsvRow,
  buildFormDataFromCsvFile,
  createCsvFile,
  normalizeCsvHeader,
  parseCsv,
  stringifyCsv,
} from './csv-utils';

export type { CsvRow };

type CsvHeaderRow = {
  id: string;
  /** The original CSV column header text */
  originalValue: string;
  /** The DB column key the user has mapped this CSV column to (or '' = unmapped) */
  mappedKey: string;
};

const IGNORE_VALUE = '__ignore__';

export interface CsvImportColumn {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
}

export interface CsvImportResult {
  file: File;
  formData: FormData;
  csvText: string;
  headers: string[];
  rows: string[][];
  matchedColumns: Array<{ header: string; matchedColumnKey: string | null }>;
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  columns: CsvImportColumn[];
  uploadButtonLabel?: string;
  saveButtonLabel?: string;
  acceptedFileName?: string;
  onUpload?: (result: CsvImportResult) => Promise<void> | void;
}

function autoMatch(originalValue: string, columns: CsvImportColumn[]): string {
  const norm = normalizeCsvHeader(originalValue);
  const found = columns.find((col) => {
    const candidates = [col.key, col.label, ...(col.aliases ?? [])];
    return candidates.some((c) => normalizeCsvHeader(c) === norm);
  });
  return found?.key ?? '';
}

function getFileSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  uploadButtonLabel = 'Upload CSV',
  saveButtonLabel = 'Save Header Changes',
  acceptedFileName,
  onUpload,
}: CsvImportDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [headerRows, setHeaderRows] = useState<CsvHeaderRow[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [hasSavedHeaders, setHasSavedHeaders] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ─── derived ─────────────────────────────────────────────────────────── */

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

  /** Which DB keys are already chosen (excluding ignore) */
  const usedKeys = useMemo(
    () => new Set(headerRows.map((h) => h.mappedKey).filter((k) => k && k !== IGNORE_VALUE)),
    [headerRows],
  );

  const requiredColumns = useMemo(() => columns.filter((c) => c.required), [columns]);

  const mappedCount = useMemo(
    () => headerRows.filter((h) => h.mappedKey && h.mappedKey !== IGNORE_VALUE).length,
    [headerRows],
  );

  const notMappedCount = useMemo(
    () => headerRows.filter((h) => !h.mappedKey || h.mappedKey === IGNORE_VALUE).length,
    [headerRows],
  );

  const missingRequired = useMemo(
    () => requiredColumns.filter((rc) => !headerRows.some((h) => h.mappedKey === rc.key)),
    [requiredColumns, headerRows],
  );

  const isReadyToSave =
    Boolean(selectedFile) &&
    headerRows.length > 0 &&
    missingRequired.length === 0;

  /* ─── reset ────────────────────────────────────────────────────────────── */

  const resetState = () => {
    setSelectedFile(null);
    setHeaderRows([]);
    setRows([]);
    setHasSavedHeaders(false);
    setIsDragging(false);
    setIsSaving(false);
    setIsUploading(false);
    setErrorMessage(null);
  };

  useEffect(() => { if (!open) resetState(); }, [open]);

  /* ─── file reading ─────────────────────────────────────────────────────── */

  const readFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Please upload a CSV file.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) throw new Error('The CSV file is empty.');
      const [fileHeaders = [], ...fileRows] = parsed;
      if (fileHeaders.length === 0) throw new Error('No headers found in the CSV file.');

      setSelectedFile(file);
      setHeaderRows(
        fileHeaders.map((header, index) => ({
          id: `header-${index}-${header || 'empty'}`,
          originalValue: header,
          mappedKey: autoMatch(header, columns),
        })),
      );
      setRows(fileRows);
      setHasSavedHeaders(false);
      setErrorMessage(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to read the CSV file.';
      setErrorMessage(msg);
      setSelectedFile(null);
      setHeaderRows([]);
      setRows([]);
    }
  };

  const handleBrowse = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await readFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await readFile(file);
  };

  /* ─── column actions ───────────────────────────────────────────────────── */

  const handleMappingChange = (headerId: string, newKey: string) => {
    setHeaderRows((prev) =>
      prev.map((h) => (h.id === headerId ? { ...h, mappedKey: newKey } : h)),
    );
    setHasSavedHeaders(false);
  };

  const handleRemoveColumn = (headerId: string, colIndex: number) => {
    setHeaderRows((prev) => prev.filter((h) => h.id !== headerId));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== colIndex)));
    setHasSavedHeaders(false);
  };

  /* ─── save / upload ────────────────────────────────────────────────────── */

  const handleSaveHeaders = async () => {
    if (!selectedFile) return;
    if (!isReadyToSave) {
      toast.error('Please map all required columns before saving.');
      return;
    }
    setIsSaving(true);
    try {
      setHasSavedHeaders(true);
      toast.success('Column mapping saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!hasSavedHeaders) {
      toast.error('Save the header changes before uploading.');
      return;
    }
    setIsUploading(true);
    try {
      // Build final headers from mapped keys (skip ignored columns)
      const activeHeaders = headerRows.map((h) =>
        h.mappedKey && h.mappedKey !== IGNORE_VALUE ? h.mappedKey : '',
      );
      const activeIndices = headerRows
        .map((_, i) => i)
        .filter((i) => headerRows[i]!.mappedKey && headerRows[i]!.mappedKey !== IGNORE_VALUE);

      const finalHeaders = activeIndices.map((i) => activeHeaders[i]!);
      const finalRows = rows.map((row) => activeIndices.map((i) => row[i] ?? ''));

      const normalizedFile = createCsvFile(
        finalHeaders,
        finalRows,
        acceptedFileName ?? selectedFile.name,
      );
      const formData = buildFormDataFromCsvFile(normalizedFile);

      const result: CsvImportResult = {
        file: normalizedFile,
        formData,
        csvText: await normalizedFile.text(),
        headers: finalHeaders,
        rows: finalRows,
        matchedColumns: finalHeaders.map((header) => ({
          header,
          matchedColumnKey: columns.find((c) => c.key === header)?.key ?? null,
        })),
      };

      await onUpload?.(result);
      toast.success('CSV uploaded successfully.');
      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload the CSV.';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  /* ─── render ───────────────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-6xl flex-col overflow-hidden p-0">
        {/* ── Fixed Header ── */}
        <DialogHeader className="border-b bg-white px-6 py-4 dark:bg-slate-950">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-sky-600" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-slate-500">{description}</DialogDescription>
          )}
        </DialogHeader>

        {/* ── Scrollable Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!selectedFile ? (
            /* ── Drop Zone ── */
            <div className="p-6">
              <div
                className={cn(
                  'flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors',
                  isDragging
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/20'
                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40',
                )}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-950">
                  <FileUp className="h-7 w-7 border-light-gray primary-text-medium text-leadgaze-dark dark:text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Drop your CSV file here
                </h3>
                <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  Upload a CSV — we'll auto-detect column mappings and let you adjust them before
                  importing.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={handleBrowse}>Browse CSV</Button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    or drag and drop a file
                  </span>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* ── File info bar ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-6 py-3 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-sky-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {getFileSizeLabel(selectedFile.size)} &bull; {rows.length} rows &bull;{' '}
                      {headerRows.length} columns
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Summary badges */}
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {mappedCount} Mapped
                  </Badge>
                  {notMappedCount > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {notMappedCount} Not mapped
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-rose-600"
                    onClick={resetState}
                    aria-label="Delete file"
                    title="Remove uploaded file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ── Required fields status ── */}
              {requiredColumns.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 border-b px-6 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Required fields
                  </span>
                  {requiredColumns.map((rc) => {
                    const isMapped = headerRows.some((h) => h.mappedKey === rc.key);
                    return (
                      <span
                        key={rc.key}
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          isMapped
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300',
                        )}
                      >
                        {isMapped ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {rc.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* ── Error ── */}
              {errorMessage && (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}

              {/* ── Spreadsheet-style mapping table ── */}
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  {/* Column headers with mapping dropdowns */}
                  <thead>
                    <tr>
                      {/* Row number column */}
                      <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                        <span className="text-xs font-semibold text-slate-400">#</span>
                      </th>

                      {headerRows.map((header, colIndex) => {
                        const mappedCol = columns.find((c) => c.key === header.mappedKey);
                        const isIgnored = header.mappedKey === IGNORE_VALUE;
                        const isMapped = Boolean(mappedCol);
                        const isRequired = mappedCol?.required;

                        return (
                          <th
                            key={header.id}
                            className={cn(
                              'min-w-[180px] border-b border-r border-slate-200 bg-white p-0 align-top dark:border-slate-800 dark:bg-slate-950',
                              isIgnored && 'opacity-50',
                            )}
                          >
                            {/* Original CSV header label */}
                            <div
                              className={cn(
                                'flex items-center justify-between gap-1 border-b px-3 py-1.5',
                                isMapped
                                  ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
                                  : isIgnored
                                    ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/20'
                                    : 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
                              )}
                            >
                              <span
                                className={cn(
                                  'truncate text-xs font-semibold',
                                  isMapped
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : isIgnored
                                      ? 'text-slate-400'
                                      : 'text-amber-600 dark:text-amber-400',
                                )}
                                title={header.originalValue}
                              >
                                {header.originalValue || '(empty)'}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {!isMapped && !isIgnored && (
                                  <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
                                )}
                                {isMapped && !isRequired && (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                )}
                                <button
                                  type="button"
                                  className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"
                                  onClick={() => handleRemoveColumn(header.id, colIndex)}
                                  title="Remove column"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Column mapping dropdown */}
                            <div className="px-2 py-2">
                              <Select
                                value={header.mappedKey || ''}
                                onValueChange={(val) => handleMappingChange(header.id, val)}
                              >
                                <SelectTrigger
                                  className={cn(
                                    'h-8 w-full border text-xs',
                                    !header.mappedKey &&
                                      'border-amber-300 bg-amber-50/40 text-slate-500 dark:border-amber-700 dark:bg-amber-950/10',
                                  )}
                                >
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={IGNORE_VALUE}>
                                    <span className="italic text-slate-400">— Ignore column —</span>
                                  </SelectItem>
                                  {columns.map((col) => (
                                    <SelectItem
                                      key={col.key}
                                      value={col.key}
                                      disabled={usedKeys.has(col.key) && header.mappedKey !== col.key}
                                    >
                                      <span className="flex items-center gap-1.5">
                                        {col.label}
                                        {col.required && (
                                          <span className="rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                                            req
                                          </span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Data preview rows */}
                  <tbody className="bg-white dark:bg-slate-950">
                    {previewRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={headerRows.length + 1}
                          className="px-4 py-8 text-center text-sm text-slate-400"
                        >
                          No data rows found in this CSV.
                        </td>
                      </tr>
                    ) : (
                      previewRows.map((dataRow, rowIndex) => (
                        <tr
                          key={`row-${rowIndex}`}
                          className="odd:bg-slate-50/50 dark:odd:bg-slate-900/20"
                        >
                          <td className="sticky left-0 border-b border-r border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                            {rowIndex + 1}
                          </td>
                          {headerRows.map((header, colIndex) => (
                            <td
                              key={`cell-${rowIndex}-${colIndex}`}
                              className={cn(
                                'max-w-[200px] truncate border-b border-r border-slate-200 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-300',
                                header.mappedKey === IGNORE_VALUE && 'opacity-40',
                              )}
                              title={dataRow[colIndex] ?? ''}
                            >
                              {dataRow[colIndex] || (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Row count note */}
              <p className="px-6 py-2 text-right text-xs text-slate-400">
                Showing {previewRows.length} of {rows.length} rows
              </p>
            </div>
          )}
        </div>

        {/* ── Fixed Footer ── */}
        {selectedFile && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-6 py-4 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium">{requiredColumns.length} required</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span>Map all required fields, then save before uploading.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleBrowse}>
                Upload another file
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveHeaders}
                disabled={!isReadyToSave || isSaving}
              >
                {isSaving ? 'Saving...' : saveButtonLabel}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!hasSavedHeaders || isUploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading...' : uploadButtonLabel}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden file input (also used by "Upload another file") */}
        {selectedFile && (
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
