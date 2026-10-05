import { useCallback, useMemo, useState } from 'react';

import type { CalendarViewState } from './useCalendarRange';
import type { CalendarDaySelection } from '@/components/CalendarDaySheet';
import type { CalendarDay } from '@/lib/calendarGrid';

/**
 * Which day's sheet is open. The workouts are read from `state` on every
 * render rather than copied, and the sheet closes whenever the view isn't
 * ready (a range reload, a disconnect).
 */
export function useDaySheet(state: CalendarViewState) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const workoutsByDate =
    state.status === 'ready' ? state.workoutsByDate : undefined;
  const selection = useMemo<CalendarDaySelection | null>(
    () =>
      workoutsByDate && selectedDay
        ? { day: selectedDay, workouts: workoutsByDate[selectedDay.date] ?? [] }
        : null,
    [workoutsByDate, selectedDay],
  );
  const close = useCallback(() => setSelectedDay(null), []);

  return { selection, open: setSelectedDay, close };
}
