export function formatDuration(seconds: number): string {
  const { hours, minutes } = roundedHoursAndMinutes(seconds);

  if (hours === 0) return `${minutes}m`;

  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

export interface SpokenDurationWords {
  hours: (hours: number) => string;
  minutes: (minutes: number) => string;
}

export function formatSpokenDuration(
  seconds: number,
  words: SpokenDurationWords,
): string {
  const { hours, minutes } = roundedHoursAndMinutes(seconds);

  if (hours === 0) return words.minutes(minutes);

  if (minutes === 0) return words.hours(hours);

  return `${words.hours(hours)} ${words.minutes(minutes)}`;
}

function roundedHoursAndMinutes(seconds: number): {
  hours: number;
  minutes: number;
} {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalMinutes = Math.round(safeSeconds / 60);

  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
