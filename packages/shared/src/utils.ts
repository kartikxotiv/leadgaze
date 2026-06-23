/**
 * Check if the code is running in a browser environment.
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

// =====================================================
// TYPES
// =====================================================

/**
 * Workspace-level localization preferences.
 * Stored in `public.workspace_preferences` table.
 */
export interface WorkspaceLocalizationPreferences {
  /** IANA timezone, e.g. 'Asia/Kolkata', 'America/New_York' */
  timezone: string;
  /** Date format pattern: 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' */
  dateFormat: string;
  /** Time display format */
  timeFormat: '12h' | '24h';
  /** ISO 4217 currency code, e.g. 'USD', 'INR', 'EUR' */
  defaultCurrency: string;
}

/** Options for date formatting */
export interface DateFormatOptions {
  /** Date format pattern, e.g. 'DD-MM-YYYY' */
  dateFormat?: string;
  /** IANA timezone for conversion, e.g. 'Asia/Kolkata' */
  timezone?: string;
}

/** Options for date-time formatting */
export interface DateTimeFormatOptions extends DateFormatOptions {
  /** Time display format */
  timeFormat?: '12h' | '24h';
}

// =====================================================
// DATE FORMAT PATTERN RESOLVER
// =====================================================

/**
 * Maps a date format pattern string to Intl.DateTimeFormat options.
 *
 * Supported patterns:
 * - 'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'
 * - 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD'
 */
function resolveDatePattern(
  format: string,
): Intl.DateTimeFormatOptions {
  // Normalize separators: treat both '-' and '/' the same
  const normalized = format.toUpperCase().replace(/\//g, '-');

  switch (normalized) {
    case 'DD-MM-YYYY':
      return { day: '2-digit', month: '2-digit', year: 'numeric' };
    case 'MM-DD-YYYY':
      return { month: '2-digit', day: '2-digit', year: 'numeric' };
    case 'YYYY-MM-DD':
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
    default:
      // Fallback to MM-DD-YYYY
      return { month: '2-digit', day: '2-digit', year: 'numeric' };
  }
}

/**
 * Formats a Date into the given pattern, respecting the separator from the format string.
 * Intl.DateTimeFormat always uses locale-appropriate separators, so we build the
 * output manually when a specific pattern + separator is requested.
 */
function formatDateWithPattern(
  date: Date,
  pattern: string,
  timezone?: string,
): string {
  const normalized = pattern.toUpperCase().replace(/\//g, '-');
  const separator = pattern.includes('/') ? '/' : '-';

  const formatOpts: Intl.DateTimeFormatOptions = {
    ...resolveDatePattern(pattern),
    timeZone: timezone || 'UTC',
  };

  // Use Intl to get the parts
  const formatter = new Intl.DateTimeFormat('en-US', formatOpts);
  const parts = formatter.formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || '';

  const day = get('day');
  const month = get('month');
  const year = get('year');

  switch (normalized) {
    case 'DD-MM-YYYY':
      return `${day}${separator}${month}${separator}${year}`;
    case 'MM-DD-YYYY':
      return `${month}${separator}${day}${separator}${year}`;
    case 'YYYY-MM-DD':
      return `${year}${separator}${month}${separator}${day}`;
    default:
      return `${month}${separator}${day}${separator}${year}`;
  }
}

// =====================================================
// CURRENCY FORMATTING
// =====================================================

/**
 * @name formatCurrency
 * @description Format a numeric value as currency using Intl.NumberFormat.
 *
 * @param params.currencyCode - ISO 4217 currency code (e.g. 'USD', 'INR')
 * @param params.locale - BCP 47 locale tag (e.g. 'en-US', 'en-IN'). Defaults to 'en-US'.
 * @param params.value - The numeric value to format
 */
export function formatCurrency(params: {
  currencyCode: string;
  locale?: string;
  value: string | number;
}) {
  const locale = params.locale || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: params.currencyCode,
  }).format(Number(params.value));
}

/**
 * @name formatNumber
 * @description Format a number using Intl.NumberFormat with locale support.
 */
export function formatNumber(
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale || 'en-US', options).format(value);
}

// =====================================================
// DATE PARSING HELPER
// =====================================================

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

// =====================================================
// DATE FORMATTING
// =====================================================

/**
 * @name formatDate
 * @description Format a date value.
 *
 * **Backward compatible**: When called with 1 argument, returns MM-DD-YYYY (existing behavior).
 * When called with options, uses the specified date format pattern and timezone.
 *
 * @param date - The date to format (string, Date, null, or undefined)
 * @param options - Optional formatting options (dateFormat, timezone)
 * @returns Formatted date string, or '-' if input is falsy/invalid
 *
 * @example
 * // Legacy usage (unchanged behavior):
 * formatDate('2026-06-22') // => '06-22-2026'
 *
 * @example
 * // With workspace preferences:
 * formatDate('2026-06-22', { dateFormat: 'DD-MM-YYYY', timezone: 'Asia/Kolkata' })
 * // => '22-06-2026'
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: DateFormatOptions,
): string {
  if (!date) return '-';
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '-';

  // If no options provided, use legacy behavior (MM-DD-YYYY)
  if (!options?.dateFormat) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  }

  // Use pattern-based formatting with optional timezone
  return formatDateWithPattern(d, options.dateFormat, options.timezone);
}

// Alias for legacy usage – same output as formatDate
export const formatDateOnly = formatDate;

// =====================================================
// DATE-TIME FORMATTING
// =====================================================

/**
 * @name formatDateTime
 * @description Format a date value with both date and time components.
 *
 * **Backward compatible**: When called with 1 argument, returns MM-DD-YYYY HH:mm (existing behavior).
 * When called with options, uses the specified formats and timezone.
 *
 * @param date - The date to format
 * @param options - Optional formatting options (dateFormat, timeFormat, timezone)
 * @returns Formatted date-time string, or '-' if input is falsy/invalid
 *
 * @example
 * // Legacy usage (unchanged behavior):
 * formatDateTime('2026-06-22T13:30:00Z') // => '06-22-2026 13:30'
 *
 * @example
 * // With workspace preferences:
 * formatDateTime('2026-06-22T13:30:00Z', {
 *   dateFormat: 'DD-MM-YYYY', timeFormat: '12h', timezone: 'Asia/Kolkata'
 * })
 * // => '22-06-2026 07:00 PM'
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  options?: DateTimeFormatOptions,
): string {
  if (!date) return '-';
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '-';

  // If no options provided, use legacy behavior (MM-DD-YYYY HH:mm)
  if (!options?.dateFormat) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day}-${year} ${hours}:${minutes}`;
  }

  // Format date part with pattern
  const datePart = formatDateWithPattern(
    d,
    options.dateFormat,
    options.timezone,
  );

  // Format time part
  const timeFormat = options.timeFormat || '24h';
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    timeZone: options.timezone || 'UTC',
  };

  const timeFormatter = new Intl.DateTimeFormat('en-US', timeOpts);
  const timePart = timeFormatter.format(d);

  return `${datePart} ${timePart}`;
}

// =====================================================
// RELATIVE DATE FORMATTING
// =====================================================

/**
 * @name formatRelativeDate
 * @description Format a date as a relative string (e.g. "2 hours ago", "in 3 days", "yesterday").
 * Uses Intl.RelativeTimeFormat for locale-aware output.
 *
 * @param date - The date to format
 * @param locale - BCP 47 locale tag. Defaults to 'en-US'.
 * @returns Relative date string
 */
export function formatRelativeDate(
  date: string | Date,
  locale?: string,
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale || 'en-US', {
    numeric: 'auto',
  });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');
  if (Math.abs(diffWeek) < 5) return rtf.format(diffWeek, 'week');
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month');
  return rtf.format(diffYear, 'year');
}

// =====================================================
// CURRENCY CONVERSION
// =====================================================

/**
 * @name convertCurrency
 * @description Convert an amount from one currency to another using a given exchange rate.
 *
 * @param amount - The original amount
 * @param rate - The exchange rate (1 unit of `from` = `rate` units of `to`)
 * @returns The converted amount, rounded to 2 decimal places
 *
 * @example
 * convertCurrency(1000, 83.12) // => 83120.00 (1000 USD at 83.12 INR/USD)
 */
export function convertCurrency(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}
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
