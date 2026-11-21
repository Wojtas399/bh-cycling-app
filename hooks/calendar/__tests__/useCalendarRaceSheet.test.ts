import { useCalendarRaceSheet } from '../useCalendarRaceSheet';
import { useDaySheet } from '../useDaySheet';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarData } from '@/lib/calendarWorkouts';
import type { Race } from '@/lib/races';
import { act, renderHook } from '@testing-library/react-native';

const OCT_24: CalendarDay = {
  date: '2026-10-24',
  dayOfMonth: 24,
  weekday: 5,
  month: 9,
  year: 2026,
};

const MARATHON: Race = {
  id: 7,
  name: 'Maraton Kraków',
  priority: 'A',
  date: '2026-10-24',
  sport: 'Ride',
};

const DATA: CalendarData = {
  itemsByDate: { '2026-10-24': [{ kind: 'race', race: MARATHON }] },
  notes: [],
};

async function renderSheets() {
  return renderHook(() => {
    const daySheet = useDaySheet(DATA);
    const raceSheet = useCalendarRaceSheet(daySheet.closeThen);

    return { daySheet, raceSheet };
  });
}

describe('useCalendarRaceSheet', () => {
  it('closes the day sheet at once and opens the Race only once it has dismissed', async () => {
    const { result } = await renderSheets();

    await act(async () => result.current.daySheet.open(OCT_24));
    await act(async () => result.current.raceSheet.openFromDaySheet(MARATHON));

    expect(result.current.daySheet.visible).toBe(false);
    expect(result.current.raceSheet.visible).toBe(false);

    await act(async () => result.current.daySheet.onDismissed());

    expect(result.current.raceSheet.visible).toBe(true);
    expect(result.current.raceSheet.race).toEqual(MARATHON);
  });

  it('leaves the bare Calendar when the Race is closed', async () => {
    const { result } = await renderSheets();

    await act(async () => result.current.daySheet.open(OCT_24));
    await act(async () => result.current.raceSheet.openFromDaySheet(MARATHON));
    await act(async () => result.current.daySheet.onDismissed());
    await act(async () => result.current.raceSheet.close());

    expect(result.current.raceSheet.visible).toBe(false);
    expect(result.current.daySheet.visible).toBe(false);
  });

  it('opens a Race at once when no day sheet is in the way', async () => {
    const { result } = await renderSheets();

    await act(async () => result.current.raceSheet.open(MARATHON));

    expect(result.current.raceSheet.visible).toBe(true);
    expect(result.current.raceSheet.race).toEqual(MARATHON);
  });
});
