/**
 * A local date-time with no zone, as intervals.icu sends `start_date_local`:
 * `YYYY-MM-DDTHH:mm:ss`.
 */
export type LocalDateTimeString = string;

/** A local time of day with no zone, `HH:mm`. */
export type LocalTimeString = string;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Adds `seconds` to a local date-time on the wall clock. The arithmetic runs
 * in UTC, so the device timezone (and its DST changes) never shifts it.
 */
export function addSecondsToLocalDateTime(
  local: LocalDateTimeString,
  seconds: number,
): LocalDateTimeString {
  const [date, time] = local.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, secs = 0] = time.split(':').map(Number);
  const result = new Date(
    Date.UTC(year, month - 1, day, hours, minutes, secs) + seconds * 1000,
  );

  return (
    `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}` +
    `T${pad(result.getUTCHours())}:${pad(result.getUTCMinutes())}:${pad(result.getUTCSeconds())}`
  );
}

/** The time of a local date-time as `H:mm`, e.g. `7:05`. */
export function formatLocalTime(local: LocalDateTimeString): string {
  const [hours, minutes] = local.split('T')[1].split(':');

  return `${Number(hours)}:${minutes}`;
}
