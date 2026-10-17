import { formatDuration } from './formatDuration';

/**
 * Formats a Workout step's length. Like `formatDuration`, but keeps the
 * seconds of a step that isn't a whole minute (`30s`, `1m 30s`), since short
 * efforts are the ones rounding would misstate. Negative or non-finite input
 * reads as zero.
 */
export function formatStepDuration(seconds: number): string {
  const safeSeconds =
    Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
  const remainder = safeSeconds % 60;

  if (remainder === 0) return formatDuration(safeSeconds);

  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${remainder}s`;

  if (minutes > 0) return `${minutes}m ${remainder}s`;

  return `${remainder}s`;
}
