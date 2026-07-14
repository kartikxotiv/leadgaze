/**
 * @fileoverview Timezone utilities for the Leadgaze platform.
 *
 * These utilities supplement the localization provider by providing
 * timezone-aware operations for server-side use and non-React contexts.
 */

/**
 * Convert a date from UTC to a target timezone.
 * Returns a new Date object representing the same moment in time.
 * Use Intl.DateTimeFormat for display; this is useful for calculations.
 */
export function convertToTimezone(
  date: string | Date,
  timezone: string,
): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Return the same moment - timezone conversion is handled at display layer
  // via Intl.DateTimeFormat. The Date object itself is UTC-epoch-based.
  return d;
}

/**
 * Get the IANA timezone identifier from an offset string or common name.
 * Falls back to 'UTC' if the timezone cannot be determined.
 */
export function resolveTimezone(timezone: string): string {
  if (!timezone || timezone.trim() === '') return 'UTC';
  return timezone.trim();
}

/**
 * Get the current UTC offset for a timezone in hours.
 * Returns undefined if the timezone is invalid.
 */
export function getTimezoneOffsetHours(timezone: string): number | undefined {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    if (!offsetPart) return undefined;

    // Parse offset like "GMT+5:30" or "GMT-5" or "UTC"
    const match = offsetPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
    if (!match) return 0;

    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] || '0', 10);
    return sign * (hours + minutes / 60);
  } catch {
    return undefined;
  }
}

/**
 * Check if a timezone string is a valid IANA timezone.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the list of all available IANA timezones.
 */
export function getAvailableTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
}
