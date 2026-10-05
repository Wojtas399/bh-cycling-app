import { useCallback, useState } from 'react';

import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface DaySheetController {
  visible: boolean;
  /** The last day opened; stays set after closing so the sheet can slide out. */
  day: CalendarDay | null;
  workouts: CalendarWorkout[];
  open: (day: CalendarDay) => void;
  close: () => void;
}

const NO_WORKOUTS: CalendarWorkout[] = [];

/**
 * Which day's sheet is open. The workouts are read from `workoutsByDate` on
 * every render rather than copied, and the sheet is closed whenever it is
 * `undefined` (a range reload, a disconnect).
 */
export function useDaySheet(
  workoutsByDate: Record<string, CalendarWorkout[]> | undefined,
): DaySheetController {
  const [day, setDay] = useState<CalendarDay | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // A reload or disconnect hides the sheet; it must not pop back open when
  // the data returns.
  if (workoutsByDate === undefined && isOpen) {
    setIsOpen(false);
  }

  const open = useCallback((selected: CalendarDay) => {
    setDay(selected);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    visible: isOpen,
    day,
    workouts: (day && workoutsByDate?.[day.date]) || NO_WORKOUTS,
    open,
    close,
  };
}
