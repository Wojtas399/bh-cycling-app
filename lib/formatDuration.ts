/**
 * Formats a duration in seconds as a compact, language-neutral label:
 * `50m`, `2h`, or `1h 50m`. Rounds to the nearest minute and treats
 * negative or non-finite inputs as zero.
 */
export function formatDuration(seconds: number): string {
  const { hours, minutes } = hoursAndMinutes(seconds);

  if (hours === 0) return `${minutes}m`;

  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

/** How a spoken duration says its hours and minutes, e.g. "1 godz.", "15 min". */
export interface SpokenDurationWords {
  hours: (hours: number) => string;
  minutes: (minutes: number) => string;
}

/**
 * A duration as a screen reader says it: "45 min", "1 godz." or
 * "1 godz. 15 min". Rounds like `formatDuration`.
 */
export function formatSpokenDuration(
  seconds: number,
  words: SpokenDurationWords,
): string {
  const { hours, minutes } = hoursAndMinutes(seconds);

  if (hours === 0) return words.minutes(minutes);

  if (minutes === 0) return words.hours(hours);

  return `${words.hours(hours)} ${words.minutes(minutes)}`;
}

/** Rounded to the nearest minute; negative or non-finite is zero. */
function hoursAndMinutes(seconds: number): { hours: number; minutes: number } {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalMinutes = Math.round(safeSeconds / 60);

  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
