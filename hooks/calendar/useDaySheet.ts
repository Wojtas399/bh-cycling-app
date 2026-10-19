import { useCallback, useState } from 'react';

import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarItem, CalendarItemsByDate } from '@/lib/calendarItems';

export interface DaySheetController {
  visible: boolean;
  /** The last day opened; stays set after closing so the sheet can slide out. */
  day: CalendarDay | null;
  items: CalendarItem[];
  open: (day: CalendarDay) => void;
  close: () => void;
}

const NO_ITEMS: CalendarItem[] = [];

/**
 * Which day's sheet is open. The items are read from `itemsByDate` on
 * every render rather than copied, and the sheet is closed whenever it is
 * `undefined` (a range reload, a disconnect).
 */
export function useDaySheet(
  itemsByDate: CalendarItemsByDate | undefined,
): DaySheetController {
  const [day, setDay] = useState<CalendarDay | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // A reload or disconnect hides the sheet; it must not pop back open when
  // the data returns.
  if (itemsByDate === undefined && isOpen) {
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
    items: (day && itemsByDate?.[day.date]) || NO_ITEMS,
    open,
    close,
  };
}
