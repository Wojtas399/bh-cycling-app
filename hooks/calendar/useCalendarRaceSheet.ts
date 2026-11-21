import { useCallback } from 'react';

import { type RaceSheetController, useRaceSheet } from '@/hooks/useRaceSheet';
import type { Race } from '@/lib/races';

export interface CalendarRaceSheetController extends RaceSheetController {
  openFromDaySheet: (race: Race) => void;
}

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
