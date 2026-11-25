import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type CalendarLabels,
  useCalendarLabels,
} from '@/components/calendar/useCalendarLabels';
import type { MonthWords, WeekWords } from '@/lib/calendarViewModels';
import { formatDuration, formatSpokenDuration } from '@/lib/formatDuration';

export interface CalendarWords extends CalendarLabels, MonthWords, WeekWords {}

export function useCalendarWords(): CalendarWords {
  const labels = useCalendarLabels();
  const { t: dayCount } = useTranslation(undefined, {
    keyPrefix: 'calendar.dayCounts',
  });
  const { t: weekWord } = useTranslation(undefined, {
    keyPrefix: 'calendar.week',
  });
  const { t: noteWord } = useTranslation(undefined, { keyPrefix: 'note' });
  const { t: commonWord } = useTranslation(undefined, { keyPrefix: 'common' });

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
      rest: weekWord('rest'),
      todayRail: day => weekWord('today', { day }),
      noteLabel: (title, when) =>
        noteWord('accessibilityLabel', { title, when }),
      moreNotes: {
        shown: count => weekWord('moreNotes', { count }),
        spoken: count => weekWord('moreNotesLabel', { count }),
      },
      stravaActivity: commonWord('stravaActivity'),
      itemKind: {
        workout: status => weekWord(`workout.${status}`),
        activity: weekWord('activity'),
        race: (priority, paired) =>
          weekWord(paired ? 'racePaired' : 'race', { priority }),
      },
      figures: {
        shown: {
          duration: formatDuration,
          load: load => weekWord('load', { load }),
        },
        spoken: {
          duration: seconds =>
            formatSpokenDuration(seconds, {
              hours: hours => weekWord('hours', { hours }),
              minutes: minutes => weekWord('minutes', { minutes }),
            }),
          load: load => weekWord('loadSpoken', { load }),
        },
      },
    }),
    [labels, dayCount, weekWord, noteWord, commonWord],
  );
}
