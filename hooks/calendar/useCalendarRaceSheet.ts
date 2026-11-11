import { useCallback } from 'react';

import { type RaceSheetController, useRaceSheet } from '@/hooks/useRaceSheet';
import type { Race } from '@/lib/races';

export interface CalendarRaceSheetController extends RaceSheetController {
  /**
   * Swaps the day sheet for the Race's: closes the day sheet now and opens
   * the Race once it has dismissed, as iOS refuses to present a sheet while
   * another is still dismissing. Sheets never stack.
   */
  openFromDaySheet: (race: Race) => void;
}

/**
 * The Calendar's Race Detail Sheet. Like Home's (`useRaceSheet`), it holds the
 * tapped Race and needs no fetch. Opening a Race from the day sheet closes
 * that first, and closing the Race leaves the bare Calendar.
 */
export function useCalendarRaceSheet(
  closeDaySheetThen: (action: () => void) => void,
): CalendarRaceSheetController {
  const sheet = useRaceSheet();
  const { open } = sheet;

  const openFromDaySheet = useCallback(
    (race: Race) => closeDaySheetThen(() => open(race)),
    [closeDaySheetThen, open],
  );

  return { ...sheet, openFromDaySheet };
}
