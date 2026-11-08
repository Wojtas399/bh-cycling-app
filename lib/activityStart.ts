import { type LocalDateString, fromLocalDateString } from './localDate';
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
  const date = formatLongDate(startLocal.split('T')[0], labels);
  const time = formatLocalTime(startLocal);

  return {
    text: `${date} · ${time}`,
    accessibilityLabel: `${date}, ${time}`,
  };
}

/**
 * A date as the short weekday, the day, the short month and the year:
 * "czw., 22 paź 2026".
 */
export function formatLongDate(
  date: LocalDateString,
  labels: NoteDateLabels,
): string {
  return `${formatShortDate(date, labels)} ${fromLocalDateString(date).getFullYear()}`;
}

/** A date as the short weekday, the day and the short month: "czw., 22 paź". */
export function formatShortDate(
  date: LocalDateString,
  labels: NoteDateLabels,
): string {
  const day = fromLocalDateString(date);
  // getDay() counts from Sunday; the labels start on Monday.
  const weekday = labels.weekdaysShort[(day.getDay() + 6) % 7];

  return `${weekday}, ${day.getDate()} ${labels.monthsShort[day.getMonth()]}`;
}
