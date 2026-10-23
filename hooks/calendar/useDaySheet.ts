import { useCallback, useState } from 'react';

import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarItem } from '@/lib/calendarItems';
import type { CalendarData } from '@/lib/calendarWorkouts';
import { type Note, notesOn } from '@/lib/notes';

export interface DaySheetController {
  visible: boolean;
  /** The last day opened; stays set after closing so the sheet can slide out. */
  day: CalendarDay | null;
  items: CalendarItem[];
  /** The Notes covering the day, in `id` order. */
  notes: Note[];
  /** The day has neither items nor Notes. */
  isEmpty: boolean;
  open: (day: CalendarDay) => void;
  close: () => void;
}

const NO_ITEMS: CalendarItem[] = [];
const NO_NOTES: Note[] = [];

/**
 * Which day's sheet is open. The items and Notes are read from `data` on
 * every render rather than copied, and the sheet is closed whenever it is
 * `undefined` (a range reload, a disconnect).
 */
export function useDaySheet(
  data: CalendarData | undefined,
): DaySheetController {
  const [day, setDay] = useState<CalendarDay | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // A reload or disconnect hides the sheet; it must not pop back open when
  // the data returns.
  if (data === undefined && isOpen) {
    setIsOpen(false);
  }

  const open = useCallback((selected: CalendarDay) => {
    setDay(selected);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const items = (day && data?.itemsByDate[day.date]) || NO_ITEMS;
  const notes = day && data ? notesOn(data.notes, day.date) : NO_NOTES;

  return {
    visible: isOpen,
    day,
    items,
    notes,
    isEmpty: items.length === 0 && notes.length === 0,
    open,
    close,
  };
}
