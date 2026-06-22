/**
 * Reusable date and timezone helpers for Taiwan (Asia/Taipei) timezone.
 * Since Taiwan does not observe Daylight Saving Time (DST), the offset is a constant UTC+8.
 */

const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Returns the current instant in time.
 */
export function getTaiwanNow(): Date {
  return new Date();
}

/**
 * Returns a Date representing the Taiwan business date (midnight, 00:00:00.000 in Taiwan timezone).
 * Useful for grouping attendance records by day.
 * 
 * For example, if Taiwan local time is 2026-06-22 18:40:00, this function returns a Date object
 * corresponding to 2026-06-22 00:00:00 in Taiwan time (which is 2026-06-21 16:00:00.000Z in UTC).
 * 
 * @param date Optional date to evaluate. Defaults to the current Taiwan time.
 */
export function getTaiwanBusinessDate(date?: Date): Date {
  const target = date || getTaiwanNow();
  // 1. Shift target date by +8 hours to align it to Taiwan local calendar date in UTC representation
  const localTime = new Date(target.getTime() + TAIWAN_OFFSET_MS);
  
  // 2. Extract UTC year, month, and day components (which now correspond to Taiwan local date)
  const y = localTime.getUTCFullYear();
  const m = localTime.getUTCMonth();
  const d = localTime.getUTCDate();
  
  // 3. Create a midnight Date in UTC
  const midnightUtc = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  
  // 4. Shift back by -8 hours to get the actual UTC instant corresponding to Taiwan midnight
  return new Date(midnightUtc.getTime() - TAIWAN_OFFSET_MS);
}

/**
 * Returns the start and end of the day in Taiwan timezone.
 * Start: 00:00:00.000 Taiwan local time (inclusive)
 * End: 23:59:59.999 Taiwan local time (inclusive)
 * 
 * @param date Optional date to evaluate. Defaults to the current Taiwan time.
 */
export function getTaiwanDayRange(date?: Date) {
  const start = getTaiwanBusinessDate(date);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/**
 * Returns the start and end boundary dates of a specific year and month in Taiwan timezone.
 * Start: 00:00:00.000 Taiwan local time on the 1st of the month (inclusive)
 * End: 23:59:59.999 Taiwan local time on the last day of the month (inclusive)
 * 
 * @param year Taiwan local calendar year (e.g. 2026)
 * @param month Taiwan local calendar month, 1-indexed (1 to 12)
 */
export function getTaiwanMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - TAIWAN_OFFSET_MS);
  const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - TAIWAN_OFFSET_MS);
  const end = new Date(nextMonthStart.getTime() - 1);
  return { start, end };
}

