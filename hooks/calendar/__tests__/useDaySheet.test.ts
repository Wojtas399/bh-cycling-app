import { useDaySheet } from '../useDaySheet';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarItem } from '@/lib/calendarItems';
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

function workout(id: number, date: string): CalendarItem {
  return {
    kind: 'workout',
    workout: { id, name: `Workout ${id}`, date, status: 'planned', blocks: [] },
  };
}

function note(id: number, start: string, end: string): Note {
  return { id, name: `Note ${id}`, description: null, color: null, start, end };
}

function data(overrides: Partial<CalendarData> = {}): CalendarData {
  return {
    itemsByDate: { '2026-10-23': [], '2026-10-24': [], '2026-10-25': [] },
    notes: [],
    ...overrides,
  };
}

async function renderSheet(initial: CalendarData | undefined) {
  return renderHook(
    ({ data }: { data: CalendarData | undefined }) => useDaySheet(data),
    { initialProps: { data: initial } },
  );
}

describe('useDaySheet', () => {
  it('starts closed with no day', async () => {
    const { result } = await renderSheet(data());

    expect(result.current.visible).toBe(false);
    expect(result.current.day).toBeNull();
    expect(result.current.items).toEqual([]);
    expect(result.current.notes).toEqual([]);
  });

  it('opens the day with its items and the Notes covering it, in id order', async () => {
    const ride = workout(1, '2026-10-24');
    const camp = note(3, '2026-10-20', '2026-10-27');
    const rest = note(8, '2026-10-24', '2026-10-25');
    const { result } = await renderSheet(
      data({
        itemsByDate: { '2026-10-24': [ride], '2026-10-25': [] },
        notes: [camp, note(5, '2026-10-25', '2026-10-26'), rest],
      }),
    );

    await act(async () => result.current.open(OCT_24));

    expect(result.current.visible).toBe(true);
    expect(result.current.day).toEqual(OCT_24);
    expect(result.current.items).toEqual([ride]);
    expect(result.current.notes).toEqual([camp, rest]);
    expect(result.current.isEmpty).toBe(false);
  });

  it('is empty only when the day has neither items nor Notes', async () => {
    const { result, rerender } = await renderSheet(data());

    await act(async () => result.current.open(OCT_24));
    expect(result.current.isEmpty).toBe(true);

    await rerender({
      data: data({ notes: [note(1, '2026-10-24', '2026-10-25')] }),
    });
    expect(result.current.isEmpty).toBe(false);

    await rerender({
      data: data({
        itemsByDate: { '2026-10-24': [workout(1, '2026-10-24')] },
      }),
    });
    expect(result.current.isEmpty).toBe(false);
  });

  it('reads the day from fresh data', async () => {
    const { result, rerender } = await renderSheet(data());

    await act(async () => result.current.open(OCT_24));
    await rerender({
      data: data({ notes: [note(4, '2026-10-24', '2026-10-25')] }),
    });

    expect(result.current.notes).toMatchObject([{ id: 4 }]);
  });

  it('closes when the data goes away, and stays closed when it returns', async () => {
    const { result, rerender } = await renderSheet(data());

    await act(async () => result.current.open(OCT_24));
    await rerender({ data: undefined });

    expect(result.current.visible).toBe(false);
    expect(result.current.notes).toEqual([]);

    await rerender({ data: data() });

    expect(result.current.visible).toBe(false);
  });

  it('closes on close, keeping the day so the sheet can slide out', async () => {
    const { result } = await renderSheet(data());

    await act(async () => result.current.open(OCT_24));
    await act(async () => result.current.close());

    expect(result.current.visible).toBe(false);
    expect(result.current.day).toEqual(OCT_24);
  });
});
