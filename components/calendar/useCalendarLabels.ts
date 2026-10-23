import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarDay } from '@/lib/calendarGrid';

export interface CalendarLabels {
  /** Short weekday names, Monday first: "Pn" … "Nd". */
  weekdaysShort: readonly string[];
  /** Month names as they read after a day number, January first. */
  monthNamesGenitive: readonly string[];
  /** "Październik 2026". */
  month: (anchor: Date) => string;
  /** "5 – 11 października 2026", or "28 września – 4 października 2026". */
  week: (days: CalendarDay[]) => string;
  /** "Poniedziałek, 5 października". */
  day: (day: CalendarDay) => string;
}

/** Polish date labels for the Calendar screen's headers, agenda, and sheet. */
export function useCalendarLabels(): CalendarLabels {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });

  return useMemo(() => {
    const monthNames = t('monthNames', { returnObjects: true });
    const monthNamesGenitive = t('monthNamesGenitive', { returnObjects: true });
    const weekdays = t('weekdays', { returnObjects: true });
    const weekdaysShort = t('weekdaysShort', { returnObjects: true });

    function dayOfMonth(day: CalendarDay): string {
      return `${day.dayOfMonth} ${monthNamesGenitive[day.month]}`;
    }

    return {
      weekdaysShort,
      monthNamesGenitive,
      month: anchor =>
        `${monthNames[anchor.getMonth()]} ${anchor.getFullYear()}`,
      week: days => {
        const first = days[0];
        const last = days[days.length - 1];

        if (first.year !== last.year) {
          return `${dayOfMonth(first)} ${first.year} – ${dayOfMonth(last)} ${last.year}`;
        }

        const start =
          first.month === last.month
            ? `${first.dayOfMonth}`
            : dayOfMonth(first);

        return `${start} – ${dayOfMonth(last)} ${last.year}`;
      },
      day: day => `${weekdays[day.weekday]}, ${dayOfMonth(day)}`,
    };
  }, [t]);
}
