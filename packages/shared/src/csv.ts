export type CsvRow = string[];

export function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

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

export function stringifyCsv(rows: CsvRow[]) {
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

export function createCsvFile(
  headers: string[],
  rows: CsvRow[],
  fileName: string,
) {
  const csvText = stringifyCsv([headers, ...rows]);
  return new File([csvText], fileName, { type: 'text/csv;charset=utf-8' });
}

export function buildFormDataFromCsvFile(file: File, fieldName = 'file') {
  const formData = new FormData();
  formData.append(fieldName, file);
  return formData;
}
