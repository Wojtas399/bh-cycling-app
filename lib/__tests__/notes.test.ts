import type { IntervalsCalendarEvent } from '../intervalsApi';
import {
  NOTE_LOOK_BACK_DAYS,
  type Note,
  isMultiDay,
  noteLastDay,
  noteWindow,
  notesOn,
  notesOverlapping,
  toNotes,
} from '../notes';

function event(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'NOTE',
    name: 'Wolne',
    start_date_local: '2026-10-20T00:00:00',
    end_date_local: '2026-10-21T00:00:00',
    ...overrides,
  };
}

function note(overrides: Partial<Note>): Note {
  return {
    id: 1,
    name: 'Wolne',
    description: null,
    color: null,
    start: '2026-10-20',
    end: '2026-10-21',
    ...overrides,
  };
}

describe('toNotes', () => {
  it('keeps only NOTE events, as Notes with an exclusive end', () => {
    expect(
      toNotes([
        event({
          id: 7,
          name: 'Obóz',
          description: 'Plan obozu',
          color: '#ff0000',
          start_date_local: '2026-10-20T00:00:00',
          end_date_local: '2026-10-25T00:00:00',
        }),
        event({ id: 8, category: 'WORKOUT' }),
      ]),
    ).toEqual([
      {
        id: 7,
        name: 'Obóz',
        description: 'Plan obozu',
        color: '#ff0000',
        start: '2026-10-20',
        end: '2026-10-25',
      },
    ]);
  });

  it('makes a Note with a missing or non-positive end cover one day', () => {
    expect(
      toNotes([
        event({ id: 1, end_date_local: undefined }),
        event({ id: 2, end_date_local: null }),
        event({ id: 3, end_date_local: '2026-10-20T00:00:00' }),
        event({ id: 4, end_date_local: '2026-10-18T00:00:00' }),
      ]).map(({ start, end }) => [start, end]),
    ).toEqual([
      ['2026-10-20', '2026-10-21'],
      ['2026-10-20', '2026-10-21'],
      ['2026-10-20', '2026-10-21'],
      ['2026-10-20', '2026-10-21'],
    ]);
  });

  it('normalises an empty, whitespace-only or missing text to null', () => {
    const empty = {
      name: '',
      description: '  \n ',
      color: '',
    } as unknown as Partial<IntervalsCalendarEvent>;
    const missing = {
      name: null,
      description: null,
      color: null,
    } as unknown as Partial<IntervalsCalendarEvent>;

    expect(
      toNotes([event({ id: 1, ...empty }), event({ id: 2, ...missing })]).map(
        ({ name, description, color }) => [name, description, color],
      ),
    ).toEqual([
      [null, null, null],
      [null, null, null],
    ]);
  });

  it('orders Notes by id, their creation order', () => {
    expect(
      toNotes([event({ id: 30 }), event({ id: 10 }), event({ id: 20 })]).map(
        ({ id }) => id,
      ),
    ).toEqual([10, 20, 30]);
  });
});

describe('notesOverlapping', () => {
  const ids = (notes: Note[]) => notes.map(({ id }) => id);

  it('keeps the Notes covering any day of the range, in order', () => {
    expect(
      ids(
        notesOverlapping(
          [
            // Ended (exclusively) on the first day: out.
            note({ id: 1, start: '2026-10-15', end: '2026-10-20' }),
            // Started earlier, still running on the first day: in.
            note({ id: 2, start: '2026-10-15', end: '2026-10-21' }),
            // Inside the range: in.
            note({ id: 3, start: '2026-10-21', end: '2026-10-22' }),
            // Starts on the last day: in.
            note({ id: 4, start: '2026-10-22', end: '2026-10-23' }),
            // Starts after the last day: out.
            note({ id: 5, start: '2026-10-23', end: '2026-10-24' }),
          ],
          '2026-10-20',
          '2026-10-22',
        ),
      ),
    ).toEqual([2, 3, 4]);
  });

  it('notesOn keeps the Notes covering one day', () => {
    expect(
      ids(
        notesOn(
          [
            note({ id: 1, start: '2026-10-19', end: '2026-10-20' }),
            note({ id: 2, start: '2026-10-18', end: '2026-10-22' }),
            note({ id: 3, start: '2026-10-20', end: '2026-10-21' }),
            note({ id: 4, start: '2026-10-21', end: '2026-10-22' }),
          ],
          '2026-10-20',
        ),
      ),
    ).toEqual([2, 3]);
  });
});

describe('noteLastDay and isMultiDay', () => {
  it('a one-day Note ends on its start day', () => {
    const oneDay = note({ start: '2026-10-20', end: '2026-10-21' });

    expect(noteLastDay(oneDay)).toBe('2026-10-20');
    expect(isMultiDay(oneDay)).toBe(false);
  });

  it('a multi-day Note ends the day before its exclusive end', () => {
    const camp = note({ start: '2026-10-30', end: '2026-11-03' });

    expect(noteLastDay(camp)).toBe('2026-11-02');
    expect(isMultiDay(camp)).toBe(true);
  });
});

describe('noteWindow', () => {
  it('reaches 31 days back from the first day, to the last day', () => {
    expect(NOTE_LOOK_BACK_DAYS).toBe(31);
    expect(noteWindow(new Date(2026, 9, 23), new Date(2026, 9, 24))).toEqual({
      oldest: '2026-09-22',
      newest: '2026-10-24',
    });
  });
});
