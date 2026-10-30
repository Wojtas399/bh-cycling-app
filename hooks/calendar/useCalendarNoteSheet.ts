import { useCallback } from 'react';

import { type NoteSheetController, useNoteSheet } from '@/hooks/useNoteSheet';
import type { Note } from '@/lib/notes';

export interface CalendarNoteSheetController extends NoteSheetController {
  /**
   * Swaps the day sheet for the Note's: closes the day sheet now and opens
   * the Note once it has dismissed, as iOS refuses to present a sheet while
   * another is still dismissing. Sheets never stack.
   */
  openFromDaySheet: (id: number) => void;
}

/**
 * The Calendar's Note Detail Sheet. Like Home's (`useNoteSheet`), it reads the
 * Note from `notes` on every render. Opening a Note from the day sheet closes
 * that first, and closing the Note leaves the bare Calendar.
 */
export function useCalendarNoteSheet(
  notes: Note[] | undefined,
  closeDaySheetThen: (action: () => void) => void,
): CalendarNoteSheetController {
  const sheet = useNoteSheet(notes);
  const { open } = sheet;

  const openFromDaySheet = useCallback(
    (id: number) => closeDaySheetThen(() => open(id)),
    [closeDaySheetThen, open],
  );

  return { ...sheet, openFromDaySheet };
}
