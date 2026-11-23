import { useCallback, useRef, useState } from 'react';

import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarItem } from '@/lib/calendarItems';
import type { CalendarData } from '@/lib/calendarMonth';
import { type Note, notesOn } from '@/lib/notes';

export interface DaySheetController {
  visible: boolean;
  day: CalendarDay | null;
  items: CalendarItem[];
  notes: Note[];
  isEmpty: boolean;
  open: (day: CalendarDay) => void;
  close: () => void;
  closeThen: (action: () => void) => void;
  onDismissed: () => void;
}

const NO_ITEMS: CalendarItem[] = [];
const NO_NOTES: Note[] = [];

export function useDaySheet(
  data: CalendarData | undefined,
): DaySheetController {
  const [day, setDay] = useState<CalendarDay | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const afterDismiss = useRef<(() => void) | null>(null);

  if (data === undefined && isOpen) {
    setIsOpen(false);
  }

  const open = useCallback((selected: CalendarDay) => {
    afterDismiss.current = null;
    setDay(selected);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const closeThen = useCallback((action: () => void) => {
    afterDismiss.current = action;
    setIsOpen(false);
  }, []);
  const onDismissed = useCallback(() => {
    const action = afterDismiss.current;

    afterDismiss.current = null;
    action?.();
  }, []);

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
    closeThen,
    onDismissed,
  };
}
