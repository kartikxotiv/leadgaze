/**
 * @fileoverview Date utility functions for workspace-aware date handling.
 *
 * Workspace date formats are handled by the localization provider
 * (Intl.DateTimeFormat). This module provides complementary date
 * manipulation utilities that are locale/timezone neutral.
 */

/**
 * Get the date-only portion (YYYY-MM-DD) of a Date or date string.
 * This is useful for storing date values without time components.
 */
export function getDateOnly(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Add a number of days to a date.
 */
export function addDays(date: string | Date, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if a date is after another date.
 */
export function isAfter(date: string | Date, compareTo: string | Date): boolean {
  const d1 = typeof date === 'string' ? new Date(date) : date;
  const d2 = typeof compareTo === 'string' ? new Date(compareTo) : compareTo;
  return d1.getTime() > d2.getTime();
}

/**
 * Check if a date is before another date.
 */
export function isBefore(date: string | Date, compareTo: string | Date): boolean {
  const d1 = typeof date === 'string' ? new Date(date) : date;
  const d2 = typeof compareTo === 'string' ? new Date(compareTo) : compareTo;
  return d1.getTime() < d2.getTime();
}

/**
 * Check if two dates fall on the same calendar day.
 */
export function isSameDay(
  date1: string | Date,
  date2: string | Date,
): boolean {
  return getDateOnly(date1) === getDateOnly(date2);
}

/**
 * Get the number of days between two dates (absolute).
 */
export function daysBetween(
  date1: string | Date,
  date2: string | Date,
): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a date as YYYY-MM-DD (ISO date-only). Safely handles null/undefined.
 */
export function formatDateISO(
  date: string | Date | null | undefined,
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}
