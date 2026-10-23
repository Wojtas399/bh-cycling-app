import { useCallback, useEffect, useRef } from 'react';

import { type NoteSheetController, useNoteSheet } from '@/hooks/useNoteSheet';
import type { Note } from '@/lib/notes';

/**
 * How long the day sheet takes to slide away. iOS refuses to present a sheet
 * while another is still dismissing, and `@expo/ui`'s universal `BottomSheet`
 * reports no "finished dismissing" event, so the Note sheet waits this long.
 * It sits above the native dismissal animation on both platforms (about
 * 300 ms) with a margin.
 */
export const DAY_SHEET_DISMISS_MS = 500;

export interface CalendarNoteSheetController extends NoteSheetController {
  /**
   * Swaps the day sheet for the Note's: closes the day sheet now and opens
   * the Note once it has dismissed. Sheets never stack.
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
  closeDaySheet: () => void,
): CalendarNoteSheetController {
  const sheet = useNoteSheet(notes);
  const { open } = sheet;
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPending = useCallback(() => {
    if (pending.current !== null) {
      clearTimeout(pending.current);
      pending.current = null;
    }
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  const openFromDaySheet = useCallback(
    (id: number) => {
      closeDaySheet();
      cancelPending();
      pending.current = setTimeout(() => {
        pending.current = null;
        open(id);
      }, DAY_SHEET_DISMISS_MS);
    },
    [cancelPending, closeDaySheet, open],
  );

  return { ...sheet, openFromDaySheet };
}
