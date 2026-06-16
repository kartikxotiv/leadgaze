/**
 * Check if the code is running in a browser environment.
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * @name formatCurrency
 * @description Format the currency based on the currency code
 */
export function formatCurrency(params: {
  currencyCode: string;
  locale: string;
  value: string | number;
}) {
  return new Intl.NumberFormat(params.locale, {
    style: 'currency',
    currency: params.currencyCode,
  }).format(Number(params.value));
}

/**
 * @name parseDate
 * @description Safely parse a date value.
 * Date-only strings like "2024-01-15" are treated as LOCAL midnight (not UTC),
 * preventing off-by-one-day bugs in timezones ahead of UTC (e.g. IST +5:30).
 */
function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  // ISO date-only: YYYY-MM-DD — parse as local midnight to avoid UTC offset shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00`);
  }
  return new Date(date);
}

/**
 * @name formatDate
 * @description Format a date string to MM-DD-YYYY
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '-';

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  return `${month}-${day}-${year}`;
}

// Alias for legacy usage – same output as formatDate
export const formatDateOnly = formatDate;

/**
 * @name formatDateTime
 * @description Format a date string to MM-DD-YYYY HH:mm
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '-';

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${month}-${day}-${year} ${hours}:${minutes}`;
}
