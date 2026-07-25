/**
 * Formats a duration in seconds as a compact, language-neutral label:
 * `50m`, `2h`, or `1h 50m`. Rounds to the nearest minute and treats
 * negative or non-finite inputs as zero.
 */
export function formatDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalMinutes = Math.round(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;

  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}
