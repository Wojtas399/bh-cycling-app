import { fromLocalDateString } from './localDate';
import { type LocalDateTimeString, formatLocalTime } from './localDateTime';
import type { NoteDateLabels } from './noteDates';

/** How Activity Details' hero dates an Activity's start. */
export interface ActivityStartLabel {
  /** "czw., 22 paź 2026 · 16:42". */
  text: string;
  /** The same with a comma for " · ": "czw., 22 paź 2026, 16:42". */
  accessibilityLabel: string;
}

/**
 * An Activity's local start as the hero shows it: the short weekday, the day,
 * the short month, the year and the start time. Short labels are Monday and
 * January first, the same ones a Note's sheet uses.
 */
export function formatActivityStart(
  startLocal: LocalDateTimeString,
  labels: NoteDateLabels,
): ActivityStartLabel {
  const day = fromLocalDateString(startLocal.split('T')[0]);
  // getDay() counts from Sunday; the labels start on Monday.
  const weekday = labels.weekdaysShort[(day.getDay() + 6) % 7];
  const date = `${weekday}, ${day.getDate()} ${labels.monthsShort[day.getMonth()]} ${day.getFullYear()}`;
  const time = formatLocalTime(startLocal);

  return {
    text: `${date} · ${time}`,
    accessibilityLabel: `${date}, ${time}`,
  };
}
