// ---------------------------------------------------------------------------
// Shared CSV utilities — used by both CsvImportDialog and useCsvExport
// ---------------------------------------------------------------------------

export type CsvRow = string[];

/**
 * Parse a CSV text string into a 2-D array of strings.
 * Handles quoted fields, escaped double-quotes, and CRLF/LF line endings.
 */
export function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    const hasContent = row.some((v) => v.length > 0) || field.length > 0;
    if (hasContent) {
      if (field.length > 0 || row.length > 0) pushField();
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
      if (nextChar === '\n') i += 1;
      pushRow();
      continue;
    }
    if (char === '\n') {
      pushRow();
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

/**
 * Convert a 2-D array of strings into a CSV text string.
 * Fields that contain commas, double-quotes, or newlines are quoted.
 */
export function stringifyCsv(rows: CsvRow[]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const v = value ?? '';
          if (/[",\n\r]/.test(v) || /^\s|\s$/.test(v))
            return `"${v.replace(/"/g, '""')}"`;
          return v;
        })
        .join(','),
    )
    .join('\n');
}

/**
 * Build a File object from headers + data rows.
 */
export function createCsvFile(
  headers: string[],
  rows: CsvRow[],
  fileName: string,
): File {
  return new File([stringifyCsv([headers, ...rows])], fileName, {
    type: 'text/csv;charset=utf-8',
  });
}

/**
 * Wrap a CSV File in a FormData object for multipart upload.
 */
export function buildFormDataFromCsvFile(
  file: File,
  fieldName = 'file',
): FormData {
  const fd = new FormData();
  fd.append(fieldName, file);
  return fd;
}

/**
 * Normalise a CSV header string for fuzzy matching (strip spaces, punctuation,
 * lowercased) — used by the import auto-match logic.
 */
export function normalizeCsvHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}
