/**
 * Parse a localized datetime string (e.g. from an HTML5 datetime-local input "2026-07-06T15:00")
 * in the context of a target IANA timezone (e.g. "America/New_York") and return it as a UTC ISO string.
 */
export function convertLocalTimeToUTC(
  localDateTimeStr: string,
  timezone: string,
): string {
  if (!localDateTimeStr) return '';
  
  // Parse assuming the digits are in UTC first to get a baseline moment
  const utcDate = new Date(localDateTimeStr + 'Z');
  if (isNaN(utcDate.getTime())) return '';

  try {
    // Get representation in target timezone versus UTC
    const tzString = utcDate.toLocaleString('en-US', { timeZone: timezone });
    const localString = utcDate.toLocaleString('en-US', { timeZone: 'UTC' });
    const diff = Date.parse(tzString) - Date.parse(localString);

    // Subtract offset to get back to UTC time corresponding to the local input time
    return new Date(utcDate.getTime() - diff).toISOString();
  } catch (error) {
    console.error('[convertLocalTimeToUTC] error:', error);
    // Fallback to naive parse if timezone is invalid
    return new Date(localDateTimeStr).toISOString();
  }
}

/**
 * Take a UTC ISO string (e.g. "2026-07-06T19:00:00Z") and format it as a localized datetime string
 * (e.g. "2026-07-06T15:00") suitable for an HTML5 datetime-local input, in the given timezone.
 */
export function convertUTCToLocalTime(
  utcDateTimeStr: string,
  timezone: string,
): string {
  if (!utcDateTimeStr) return '';
  const date = new Date(utcDateTimeStr);
  if (isNaN(date.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    let hour = parts.find((p) => p.type === 'hour')?.value;
    const minute = parts.find((p) => p.type === 'minute')?.value;

    if (hour === '24') {
      hour = '00';
    }

    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    console.error('[convertUTCToLocalTime] error:', error);
    // Fallback to simple slicing in local timezone
    return date.toISOString().slice(0, 16);
  }
}
