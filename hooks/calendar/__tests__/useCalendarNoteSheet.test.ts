import { useCalendarNoteSheet } from '../useCalendarNoteSheet';
import { useDaySheet } from '../useDaySheet';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarData } from '@/lib/calendarWorkouts';
import type { Note } from '@/lib/notes';
import { act, renderHook } from '@testing-library/react-native';

const OCT_24: CalendarDay = {
  date: '2026-10-24',
  dayOfMonth: 24,
  weekday: 5,
  month: 9,
  year: 2026,
};

const CAMP: Note = {
  id: 3,
  name: 'Obóz',
  description: null,
  color: null,
  start: '2026-10-20',
  end: '2026-10-27',
};

const DATA: CalendarData = {
  itemsByDate: { '2026-10-24': [] },
  notes: [CAMP],
};

/** The Calendar's two sheets, wired as the screen wires them. */
async function renderSheets() {
  return renderHook(() => {
    const daySheet = useDaySheet(DATA);
    const noteSheet = useCalendarNoteSheet(DATA.notes, daySheet.closeThen);

    return { daySheet, noteSheet };
  });
}

describe('useCalendarNoteSheet', () => {
  it('closes the day sheet at once and opens the Note only once it has dismissed', async () => {
    const { result } = await renderSheets();

    await act(async () => result.current.daySheet.open(OCT_24));
    await act(async () => result.current.noteSheet.openFromDaySheet(3));

    expect(result.current.daySheet.visible).toBe(false);
    expect(result.current.noteSheet.visible).toBe(false);

    await act(async () => result.current.daySheet.onDismissed());

    expect(result.current.noteSheet.visible).toBe(true);
    expect(result.current.noteSheet.note).toEqual(CAMP);
  });

  it('leaves the bare Calendar when the Note is closed', async () => {
    const { result } = await renderSheets();

    await act(async () => result.current.daySheet.open(OCT_24));
    await act(async () => result.current.noteSheet.openFromDaySheet(3));
    await act(async () => result.current.daySheet.onDismissed());
    await act(async () => result.current.noteSheet.close());

    expect(result.current.noteSheet.visible).toBe(false);
    expect(result.current.daySheet.visible).toBe(false);
  });

  it('opens a Note at once when no day sheet is in the way', async () => {
    const { result } = await renderSheets();

    await act(async () => result.current.noteSheet.open(3));

    expect(result.current.noteSheet.visible).toBe(true);
  });
});
