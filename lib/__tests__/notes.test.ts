import type { IntervalsCalendarEvent } from '../intervalsApi';
import {
  NOTE_LOOK_BACK_DAYS,
  type Note,
  isMultiDay,
  noteLastDay,
  noteText,
  noteWindow,
  notesOn,
  notesOverlapping,
  toNotes,
} from '../notes';
import {
  type IntervalsJson,
  fromIntervalsJson,
} from '@/test-utils/intervalsJson';

function event(
  overrides: Partial<IntervalsJson<IntervalsCalendarEvent>>,
): IntervalsCalendarEvent {
  return fromIntervalsJson<IntervalsCalendarEvent>({
    id: 1,
    category: 'NOTE',
    name: 'Wolne',
    start_date_local: '2026-10-20T00:00:00',
    end_date_local: '2026-10-21T00:00:00',
    ...overrides,
  });
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

  it('normalises a name, text or colour that intervals.icu sends empty, whitespace-only, null or not at all to null', () => {
    const empty = {
      name: '',
      description: '  \n ',
      color: '',
    } satisfies Partial<IntervalsCalendarEvent>;
    const missing = {
      name: null,
      description: null,
      color: null,
    } satisfies Partial<IntervalsJson<IntervalsCalendarEvent>>;

    const absent = {
      name: undefined,
      description: undefined,
      color: undefined,
    } satisfies Partial<IntervalsCalendarEvent>;

    expect(
      toNotes([
        event({ id: 1, ...empty }),
        event({ id: 2, ...missing }),
        event({ id: 3, ...absent }),
      ]).map(({ name, description, color }) => [name, description, color]),
    ).toEqual([
      [null, null, null],
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

  it('keeps the Notes covering any day of the range, its first and last day included, in order', () => {
    const endedExclusivelyOnTheFirstDay = note({
      id: 1,
      start: '2026-10-15',
      end: '2026-10-20',
    });
    const startedEarlierStillRunningOnTheFirstDay = note({
      id: 2,
      start: '2026-10-15',
      end: '2026-10-21',
    });
    const insideTheRange = note({
      id: 3,
      start: '2026-10-21',
      end: '2026-10-22',
    });
    const startsOnTheLastDay = note({
      id: 4,
      start: '2026-10-22',
      end: '2026-10-23',
    });
    const startsAfterTheLastDay = note({
      id: 5,
      start: '2026-10-23',
      end: '2026-10-24',
    });

    expect(
      ids(
        notesOverlapping(
          [
            endedExclusivelyOnTheFirstDay,
            startedEarlierStillRunningOnTheFirstDay,
            insideTheRange,
            startsOnTheLastDay,
            startsAfterTheLastDay,
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
  it('reaches 31 days back from the first day, as intervals.icu filters Notes by start date, so a Note started up to then still shows, to the last day', () => {
    expect(NOTE_LOOK_BACK_DAYS).toBe(31);
    expect(noteWindow(new Date(2026, 9, 23), new Date(2026, 9, 24))).toEqual({
      oldest: '2026-09-22',
      newest: '2026-10-24',
    });
  });
});

describe('noteText', () => {
  it('is empty for a Note without text', () => {
    expect(noteText(note({ description: null }))).toBe('');
  });

  it('is the Markdown left once the HTML is stripped, without outer blank lines', () => {
    expect(
      noteText(
        note({ description: '<p>**Rano** <i>rozjazd</i></p><p>Wieczór</p>' }),
      ),
    ).toBe('**Rano** rozjazd\n\nWieczór');
  });
});
