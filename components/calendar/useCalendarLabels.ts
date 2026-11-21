import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CalendarDay } from '@/lib/calendarGrid';
import { formatMonthTitle } from '@/lib/formatMonthTitle';
import type {
  MonthNamesFromJanuary,
  WeekdayNamesFromMonday,
} from '@/lib/noteDates';

export interface CalendarLabels {
  weekdaysShort: WeekdayNamesFromMonday;
  monthNamesGenitive: MonthNamesFromJanuary;
  month: (anchor: Date) => string;
  week: (days: CalendarDay[]) => string;
  day: (day: CalendarDay) => string;
}

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
      month: anchor => formatMonthTitle(anchor, monthNames),
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
