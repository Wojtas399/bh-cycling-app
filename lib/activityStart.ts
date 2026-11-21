import { type LocalDateTimeString, formatLocalTime } from './localDateTime';
import { type NoteDateLabels, formatLongDate } from './noteDates';

export interface ActivityStartLabel {
  text: string;
  accessibilityLabel: string;
}

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
