export const DHAKA_TIME_ZONE = 'Asia/Dhaka';

// Bangladesh Standard Time is UTC+6 all year and has never observed daylight saving,
// so a fixed offset is exact and avoids relying on the runtime's timezone database.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Calendar fields of an instant as seen in Dhaka, without pulling in a tz library. */
function dhakaParts(date: Date) {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** Midnight that opens the Dhaka calendar day containing `now`. */
export function startOfDhakaDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - DHAKA_OFFSET_MS
  );
}

/** Midnight that opens the Dhaka calendar month containing `now`. */
export function startOfDhakaMonth(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - DHAKA_OFFSET_MS);
}

/** Unambiguous Dhaka wall-clock rendering, e.g. "30 Sep 2026, 6:12 PM". */
export function formatDhakaDateTime(value: Date | string | number | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  const { year, month, day, hour, minute } = dhakaParts(date);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const minutes = String(minute).padStart(2, '0');
  return `${day} ${MONTH_ABBREVIATIONS[month - 1]} ${year}, ${hour12}:${minutes} ${suffix}`;
}

/** The date a ride happened, in Dhaka, e.g. "30 Sep 2026". */
export function formatDhakaDate(value: Date | string | number | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  const { year, month, day } = dhakaParts(date);
  return `${day} ${MONTH_ABBREVIATIONS[month - 1]} ${year}`;
}