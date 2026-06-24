'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  PencilLine,
  Plus,
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
import { Input } from './input';
import { Label } from './label';
import { Separator } from './separator';
import { cn } from '../lib/utils';

export type CsvRow = string[];

type CsvHeaderRow = {
  id: string;
  value: string;
};

function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    const hasContent = row.some((value) => value.length > 0) || field.length > 0;
    if (hasContent) {
      if (field.length > 0 || row.length > 0) {
        pushField();
      }
      rows.push(row);
    }
    row = [];
    field = '';
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      pushField();
      continue;
    }

    if (char === '\r') {
      if (nextChar === '\n') {
        i += 1;
      }
      pushRow();
      continue;
    }

    if (char === '\n') {
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

function stringifyCsv(rows: CsvRow[]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const normalized = value ?? '';
          if (/[",\n\r]/.test(normalized) || /^\s|\s$/.test(normalized)) {
            return `"${normalized.replace(/"/g, '""')}"`;
          }
          return normalized;
        })
        .join(','),
    )
    .join('\n');
}

function createCsvFile(headers: string[], rows: CsvRow[], fileName: string) {
  const csvText = stringifyCsv([headers, ...rows]);
  return new File([csvText], fileName, { type: 'text/csv;charset=utf-8' });
}

function buildFormDataFromCsvFile(file: File, fieldName = 'file') {
  const formData = new FormData();
  formData.append(fieldName, file);
  return formData;
}

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
  matchedColumns: Array<{
    header: string;
    matchedColumnKey: string | null;
  }>;
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

function matchColumn(header: string, columns: CsvImportColumn[]) {
  const normalizedHeader = normalizeCsvHeader(header);

  return (
    columns.find((column) => {
      const candidates = [
        column.key,
        column.label,
        ...(column.aliases ?? []),
      ];

      return candidates.some(
        (candidate) => normalizeCsvHeader(candidate) === normalizedHeader,
      );
    }) ?? null
  );
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
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [savedHeaders, setSavedHeaders] = useState<string[]>([]);
  const [hasSavedHeaders, setHasSavedHeaders] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const expectedColumns = useMemo(() => columns, [columns]);

  const matchingSummary = useMemo(() => {
    const matchedColumns = headerRows.map((headerRow) => matchColumn(headerRow.value, columns));
    const matchedKeys = new Set(
      matchedColumns
        .filter((column): column is CsvImportColumn => Boolean(column))
        .map((column) => column.key),
    );

    const requiredColumns = expectedColumns.filter((column) => column.required);
    const missingRequiredColumns = requiredColumns.filter(
      (column) => !matchedKeys.has(column.key),
    );

    const headerValues = headerRows.map((headerRow) => headerRow.value);
    const emptyHeaders = headerValues
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => !header.trim());

    const duplicateHeaders = headerValues.filter((header, index, all) => {
      const normalized = normalizeCsvHeader(header);
      if (!normalized) return false;
      return (
        all.findIndex(
          (value) => normalizeCsvHeader(value) === normalized,
        ) !== index
      );
    });

    const unmatchedHeaders = headerValues.filter((header) => !matchColumn(header, columns));

    return {
      matchedColumns,
      missingRequiredColumns,
      emptyHeaders,
      duplicateHeaders,
      unmatchedHeaders,
      totalMatched: matchedColumns.filter(Boolean).length,
    };
  }, [columns, expectedColumns, headerRows]);

  const requiredFieldRows = useMemo(
    () =>
      expectedColumns
        .filter((column) => column.required)
        .map((column) => ({
          column,
          matchedRow:
            headerRows.find((row) => matchColumn(row.value, columns)?.key === column.key) ?? null,
        })),
    [columns, expectedColumns, headerRows],
  );

  const unmatchedRows = useMemo(
    () =>
      headerRows
        .map((row, index) => ({
          row,
          index,
          matchedColumn: matchColumn(row.value, columns),
        }))
        .filter(({ matchedColumn }) => !matchedColumn),
    [columns, headerRows],
  );

  const matchedOptionalCount = useMemo(
    () =>
      headerRows.filter((row) => {
        const matched = matchColumn(row.value, columns);
        return Boolean(matched && !matched.required);
      }).length,
    [columns, headerRows],
  );

  const previewColumns = useMemo(
    () => headerRows.map((row) => row.value || 'Column'),
    [headerRows],
  );

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  const isReadyToSave =
    Boolean(selectedFile) &&
    headerRows.length > 0 &&
    matchingSummary.missingRequiredColumns.length === 0 &&
    matchingSummary.emptyHeaders.length === 0 &&
    matchingSummary.duplicateHeaders.length === 0 &&
    matchingSummary.unmatchedHeaders.length === 0;

  const resetState = () => {
    setSelectedFile(null);
    setHeaderRows([]);
    setRows([]);
    setOriginalHeaders([]);
    setSavedHeaders([]);
    setHasSavedHeaders(false);
    setIsDragging(false);
    setIsSaving(false);
    setIsUploading(false);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const readFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Please upload a CSV file.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (parsed.length === 0) {
        throw new Error('The CSV file is empty.');
      }

      const [fileHeaders = [], ...fileRows] = parsed;

      if (fileHeaders.length === 0) {
        throw new Error('No headers were found in the CSV file.');
      }

      setSelectedFile(file);
      setOriginalHeaders(fileHeaders);
      setHeaderRows(
        fileHeaders.map((header, index) => ({
          id: `header-${index}-${header || 'empty'}`,
          value: header,
        })),
      );
      setRows(fileRows);
      setSavedHeaders([]);
      setHasSavedHeaders(false);
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to read the CSV file.';
      setErrorMessage(message);
      setSelectedFile(null);
      setHeaderRows([]);
      setRows([]);
      setOriginalHeaders([]);
      setSavedHeaders([]);
      setHasSavedHeaders(false);
    }
  };

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await readFile(file);
    event.target.value = '';
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await readFile(file);
  };

  const handleAddColumn = () => {
    const nextIndex = headerRows.length;
    const nextId =
      globalThis.crypto?.randomUUID?.() ?? `header-${Date.now()}-${nextIndex}`;

    setHeaderRows((currentRows) => [
      ...currentRows,
      {
        id: nextId,
        value: '',
      },
    ]);
    setOriginalHeaders((currentHeaders) => [...currentHeaders, '']);
    setRows((currentRows) => currentRows.map((dataRow) => [...dataRow, '']));
    setHasSavedHeaders(false);
  };

  const handleSaveHeaders = async () => {
    if (!selectedFile) return;

    if (!isReadyToSave) {
      toast.error('Please match every CSV header to a database column first.');
      return;
    }

    setIsSaving(true);
    try {
      setSavedHeaders(headerRows.map((row) => row.value.trim()));
      setHasSavedHeaders(true);
      toast.success('CSV headers are ready.');
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
      const normalizedFile = createCsvFile(
        savedHeaders,
        rows,
        acceptedFileName ?? selectedFile.name,
      );
      const formData = buildFormDataFromCsvFile(normalizedFile);

      const result: CsvImportResult = {
        file: normalizedFile,
        formData,
        csvText: await normalizedFile.text(),
        headers: savedHeaders,
        rows,
        matchedColumns: savedHeaders.map((header) => {
          const matchedColumn = matchColumn(header, columns);
          return {
            header,
            matchedColumnKey: matchedColumn?.key ?? null,
          };
        }),
      };

      await onUpload?.(result);
      toast.success('CSV is ready to be sent to the API.');
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to prepare the CSV.';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-white px-6 py-4 dark:bg-slate-950">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-sky-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {!selectedFile ? (
            <div
              className={cn(
                'flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors',
                isDragging
                  ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/20'
                  : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40',
              )}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-950">
                <FileUp className="h-7 w-7 text-sky-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Drop your CSV file here
              </h3>
              <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                Upload a CSV, review the detected headers, and edit any mismatched
                names directly in the modal before sending it to the API.
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
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-sky-600" />
                    <p className="font-medium text-slate-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {getFileSizeLabel(selectedFile.size)} • {rows.length} data rows •{' '}
                    {originalHeaders.length} columns
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={hasSavedHeaders ? 'secondary' : 'outline'}>
                    {hasSavedHeaders ? 'Headers saved' : 'Awaiting save'}
                  </Badge>
                  <Button variant="outline" onClick={handleBrowse}>
                    Replace file
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      resetState();
                    }}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}

              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Field Review
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Required fields are pinned at the top. Only columns that still
                      need attention are shown below.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      Required {requiredFieldRows.length}
                    </Badge>
                    <Badge variant="outline">
                      Matched optional {matchedOptionalCount}
                    </Badge>
                    <Badge variant="outline">
                      Needs attention {unmatchedRows.length}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Required fields
                      </h4>
                      <p className="text-xs text-slate-400">
                        These columns must be mapped before upload.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {requiredFieldRows.map(({ column, matchedRow }) => (
                      <div
                        key={column.key}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {column.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Key: <span className="font-medium">{column.key}</span>
                            {column.aliases?.length ? (
                              <>
                                {' '}· aliases: {column.aliases.join(', ')}
                              </>
                            ) : null}
                          </p>
                        </div>

                        {matchedRow ? (
                          <Badge className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Matched from {matchedRow.value || 'Empty header'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Missing from CSV
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Needs attention
                      </h4>
                      <p className="text-xs text-slate-400">
                        Only unmatched columns are shown here.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddColumn}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add column
                    </Button>
                  </div>

                  {unmatchedRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
                      All optional columns are matched.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {unmatchedRows.map(({ row, index }) => (
                        <div
                          key={row.id}
                          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1.4fr_0.95fr] dark:border-slate-800 dark:bg-slate-900/40"
                        >
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-slate-500">
                              Imported header
                            </Label>
                            <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                              {originalHeaders[index] || 'Empty header'}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <Label
                                htmlFor={`csv-header-${row.id}`}
                                className="text-xs uppercase tracking-wide text-slate-500"
                              >
                                Database column
                              </Label>
                              <span className="text-[11px] text-slate-400">
                                {row.value.trim() || 'Type a column key'}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Input
                                id={`csv-header-${row.id}`}
                                value={row.value}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  const normalizedNextValue = normalizeCsvHeader(nextValue);
                                  const isDuplicate =
                                    Boolean(normalizedNextValue) &&
                                    headerRows.some(
                                      (item) =>
                                        item.id !== row.id &&
                                        normalizeCsvHeader(item.value) === normalizedNextValue,
                                    );

                                  if (isDuplicate) {
                                    toast.error('That column key is already in use.');
                                    return;
                                  }

                                  const nextRows = headerRows.map((item) =>
                                    item.id === row.id
                                      ? { ...item, value: nextValue }
                                      : item,
                                  );
                                  setHeaderRows(nextRows);
                                  setHasSavedHeaders(false);
                                }}
                                placeholder="first_name"
                                className="bg-white dark:bg-slate-950"
                              />
                              <PencilLine className="h-4 w-4 text-slate-400" />
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              Use the exact column key from the schema.
                            </p>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div className="pt-1">
                              <Badge variant="destructive" className="gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Unmatched
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-slate-500 hover:text-rose-600"
                              onClick={() => {
                                const nextRows = headerRows.filter((item) => item.id !== row.id);
                                const nextOriginalHeaders = originalHeaders.filter((_, originalIndex) => originalIndex !== index);
                                const nextDataRows = rows.map((dataRow) =>
                                  dataRow.filter((_, columnIndex) => columnIndex !== index),
                                );
                                setHeaderRows(nextRows);
                                setOriginalHeaders(nextOriginalHeaders);
                                setRows(nextDataRows);
                                setHasSavedHeaders(false);
                              }}
                              aria-label={`Remove header ${row.value || row.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {matchingSummary.missingRequiredColumns.length === 0 && (
                  <>
                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            CSV preview
                          </h4>
                          <p className="text-xs text-slate-400">
                            Previewing the first {previewRows.length} rows from the
                            cleaned CSV.
                          </p>
                        </div>
                        <Badge variant="outline">
                          Ready to preview
                        </Badge>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900">
                              <tr>
                                <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                                  #
                                </th>
                                {previewColumns.map((column, columnIndex) => (
                                  <th
                                    key={`preview-header-${columnIndex}-${column}`}
                                    className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800"
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-950">
                              {previewRows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={previewColumns.length + 1}
                                    className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                                  >
                                    No data rows found in this CSV.
                                  </td>
                                </tr>
                              ) : (
                                previewRows.map((dataRow, rowIndex) => (
                                  <tr key={`preview-row-${rowIndex}`} className="odd:bg-slate-50/50 dark:odd:bg-slate-900/30">
                                    <td className="sticky left-0 border-b border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                                      {rowIndex + 1}
                                    </td>
                                    {previewColumns.map((_, columnIndex) => (
                                      <td
                                        key={`preview-cell-${rowIndex}-${columnIndex}`}
                                        className="border-b border-slate-200 px-4 py-3 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                                      >
                                        {dataRow[columnIndex] ?? '-'}
                                      </td>
                                    ))}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(matchingSummary.missingRequiredColumns.length > 0 ||
                  matchingSummary.duplicateHeaders.length > 0 ||
                  matchingSummary.unmatchedHeaders.length > 0) && (
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                    {matchingSummary.missingRequiredColumns.length > 0 && (
                      <p>
                        Missing required columns:{' '}
                        <span className="font-medium">
                          {matchingSummary.missingRequiredColumns
                            .map((column) => column.label)
                            .join(', ')}
                        </span>
                      </p>
                    )}
                    {matchingSummary.duplicateHeaders.length > 0 && (
                      <p>
                        Duplicate headers detected:{' '}
                        <span className="font-medium">
                          {Array.from(new Set(matchingSummary.duplicateHeaders)).join(', ')}
                        </span>
                      </p>
                    )}
                    {matchingSummary.unmatchedHeaders.length > 0 && (
                      <p>
                        Unmatched headers:{' '}
                        <span className="font-medium">
                          {Array.from(new Set(matchingSummary.unmatchedHeaders)).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Badge variant="outline" className="gap-1">
                      <span>
                        Required: {expectedColumns.filter((column) => column.required).length}
                      </span>
                    </Badge>
                    <span>
                      You only need to keep the columns you want to import; required
                      fields must still be present.
                    </span>
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
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
