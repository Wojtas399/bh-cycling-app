export type LocalDateTimeString = string;

export type LocalTimeString = string;

const pad = (value: number) => String(value).padStart(2, '0');

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

export function formatLocalTime(local: LocalDateTimeString): string {
  const [hours, minutes] = local.split('T')[1].split(':');

  return `${Number(hours)}:${minutes}`;
}
