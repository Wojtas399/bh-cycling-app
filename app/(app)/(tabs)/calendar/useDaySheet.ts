import { useCallback, useMemo, useState } from 'react';

import type { CalendarDaySelection } from '@/components/CalendarDaySheet';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface DaySheetController {
  selection: CalendarDaySelection | null;
  open: (day: CalendarDay) => void;
  close: () => void;
}

/**
 * Which day's sheet is open. The workouts are read from `workoutsByDate` on
 * every render rather than copied, and the sheet closes whenever it is
 * `undefined` (a range reload, a disconnect).
 */
export function useDaySheet(
  workoutsByDate: Record<string, CalendarWorkout[]> | undefined,
): DaySheetController {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

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
