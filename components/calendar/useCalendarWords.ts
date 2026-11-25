import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type CalendarLabels,
  useCalendarLabels,
} from '@/components/calendar/useCalendarLabels';
import type { MonthWords } from '@/lib/calendarViewModels';

export interface CalendarWords extends CalendarLabels, MonthWords {}

export function useCalendarWords(): CalendarWords {
  const labels = useCalendarLabels();
  const { t: dayCount } = useTranslation(undefined, {
    keyPrefix: 'calendar.dayCounts',
  });
  const { t: noteWord } = useTranslation(undefined, { keyPrefix: 'note' });

  return useMemo(
    () => ({
      ...labels,
      dayCounts: {
        race: priority => dayCount('race', { priority }),
        races: (count, priorities) => dayCount('races', { count, priorities }),
        workouts: count => dayCount('workouts', { count }),
        activities: count => dayCount('activities', { count }),
        notes: count => dayCount('notes', { count }),
      },
      untitledNote: noteWord('untitled'),
    }),
    [labels, dayCount, noteWord],
  );
}
