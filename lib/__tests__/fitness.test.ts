import {
  formatFitnessReadout,
  formatForm,
  sliceFitnessRange,
  toFitnessDays,
} from '../fitness';
import type { IntervalsWellnessDay } from '../intervalsApi';
import { addDays, fromLocalDateString, toLocalDateString } from '../localDate';

const TODAY = '2026-11-06';

/** The local date `offset` days from `TODAY`. */
function dayFrom(offset: number): string {
  return toLocalDateString(addDays(fromLocalDateString(TODAY), offset));
}

describe('formatForm', () => {
  it('signs a fresh Form with a plus', () => {
    expect(formatForm(5)).toBe('+5');
  });

  it('signs a tired Form with a minus', () => {
    expect(formatForm(-12)).toBe('-12');
  });

  it('shows a Form of zero with no sign', () => {
    expect(formatForm(0)).toBe('0');
  });
});

describe('toFitnessDays', () => {
  it('gives a year of days, oldest first, ending today, from a row for every day', () => {
    const rows: IntervalsWellnessDay[] = Array.from(
      { length: 365 },
      (_, index) => ({
        id: dayFrom(index - 364),
        ctl: 40,
        atl: 45,
        ctlLoad: 60,
      }),
    );

    const days = toFitnessDays(rows, TODAY);

    expect(days).toHaveLength(365);
    expect(days[0].date).toBe('2025-11-07');
    expect(days[364].date).toBe(TODAY);
    expect(days.map(day => day.date)).toEqual(rows.map(row => row.id));
  });

  it('rounds Fitness, Fatigue and load, and takes Form from the rounded values', () => {
    const days = toFitnessDays(
      [{ id: TODAY, ctl: 42.6, atl: 50.4, ctlLoad: 84.5 }],
      TODAY,
    );

    expect(days[364]).toEqual({
      date: TODAY,
      fitness: 43,
      fatigue: 50,
      form: -7,
      load: 85,
    });
  });

  /** A day without values: no data, never `0`. */
  function noValues(date: string) {
    return { date, fitness: null, fatigue: null, form: null, load: null };
  }

  it('gives a day without values for each day with no row', () => {
    const days = toFitnessDays(
      [{ id: dayFrom(-1), ctl: 41, atl: 44, ctlLoad: 0 }],
      TODAY,
    );

    expect(days).toHaveLength(365);
    expect(days[0]).toEqual(noValues('2025-11-07'));
    expect(days[363]).toEqual({
      date: dayFrom(-1),
      fitness: 41,
      fatigue: 44,
      form: -3,
      load: 0,
    });
    expect(days[364]).toEqual(noValues(TODAY));
  });

  it('gives a day without values for a row whose metrics are all null', () => {
    const days = toFitnessDays(
      [{ id: TODAY, ctl: null, atl: null, ctlLoad: null }],
      TODAY,
    );

    expect(days[364]).toEqual(noValues(TODAY));
  });

  it.each([
    ['Fitness', { ctl: null, atl: 44.4 }, { fitness: null, fatigue: 44 }],
    ['Fatigue', { ctl: 40.6, atl: undefined }, { fitness: 41, fatigue: null }],
  ])(
    'keeps the other value but gives no Form or load without %s',
    (_name, metrics, values) => {
      const days = toFitnessDays(
        [{ id: TODAY, ctlLoad: 90, ...metrics }],
        TODAY,
      );

      expect(days[364]).toEqual({
        date: TODAY,
        ...values,
        form: null,
        load: null,
      });
    },
  );

  it('gives a rest day load 0 when a day with values has no load', () => {
    const days = toFitnessDays(
      [
        { id: dayFrom(-1), ctl: 40, atl: 38, ctlLoad: null },
        { id: TODAY, ctl: 39.8, atl: 33.2 },
      ],
      TODAY,
    );

    expect(days[363].load).toBe(0);
    expect(days[364].load).toBe(0);
  });

  it('keeps the real zeros intervals.icu returns before the history builds', () => {
    const days = toFitnessDays(
      [
        { id: dayFrom(-2), ctl: 0, atl: 0, ctlLoad: 0 },
        { id: dayFrom(-1), ctl: 0.4, atl: 2.6, ctlLoad: 18 },
      ],
      TODAY,
    );

    expect(days[362]).toEqual({
      date: dayFrom(-2),
      fitness: 0,
      fatigue: 0,
      form: 0,
      load: 0,
    });
    expect(days[363]).toEqual({
      date: dayFrom(-1),
      fitness: 0,
      fatigue: 3,
      form: -3,
      load: 18,
    });
  });

  it('ignores rows outside the year ending today', () => {
    const days = toFitnessDays(
      [
        { id: dayFrom(-365), ctl: 50, atl: 50, ctlLoad: 50 },
        { id: dayFrom(1), ctl: 60, atl: 70, ctlLoad: 0 },
      ],
      TODAY,
    );

    expect(days).toHaveLength(365);
    expect(days[0].date).toBe(dayFrom(-364));
    expect(days[364].date).toBe(TODAY);
    expect(days.every(day => day.fitness === null)).toBe(true);
  });
});

describe('sliceFitnessRange', () => {
  /** A full year of rows with values. */
  const YEAR = toFitnessDays(
    Array.from({ length: 365 }, (_, index) => ({
      id: dayFrom(index - 364),
      ctl: 40,
      atl: 40,
      ctlLoad: 50,
    })),
    TODAY,
  );

  it.each([
    ['6w', 42, '2026-09-26'],
    ['3m', 91, '2026-08-08'],
    ['1y', 365, '2025-11-07'],
  ] as const)(
    'gives the %s range its last %i days, ending today',
    (range, length, first) => {
      const slice = sliceFitnessRange(YEAR, range);

      expect(slice).toHaveLength(length);
      expect(slice[0].date).toBe(first);
      expect(slice[length - 1].date).toBe(TODAY);
    },
  );

  it('spans the whole range for a history shorter than it', () => {
    const days = toFitnessDays(
      Array.from({ length: 24 }, (_, index) => ({
        id: dayFrom(index - 23),
        ctl: 3,
        atl: 8,
        ctlLoad: 40,
      })),
      TODAY,
    );

    const slice = sliceFitnessRange(days, '3m');

    expect(slice).toHaveLength(91);
    expect(slice[0]).toEqual({
      date: '2026-08-08',
      fitness: null,
      fatigue: null,
      form: null,
      load: null,
    });
    expect(slice.filter(day => day.form !== null)).toHaveLength(24);
  });
});

describe('formatFitnessReadout', () => {
  const LABELS = {
    today: 'Dziś',
    monthsShort: [
      'sty',
      'lut',
      'mar',
      'kwi',
      'maj',
      'cze',
      'lip',
      'sie',
      'wrz',
      'paź',
      'lis',
      'gru',
    ],
  };

  const DAY = { fitness: 48, fatigue: 43, form: 5, load: 112 };

  it("says Dziś over today's values", () => {
    expect(
      formatFitnessReadout({ date: TODAY, ...DAY }, TODAY, LABELS),
    ).toEqual({
      date: 'Dziś',
      fitness: '48',
      fatigue: '43',
      form: '+5',
      load: '112',
    });
  });

  it('dates an earlier day of this year by its day and short month', () => {
    expect(
      formatFitnessReadout({ date: '2026-11-03', ...DAY }, TODAY, LABELS).date,
    ).toBe('3 lis');
  });

  it('adds the year to a day from last year', () => {
    expect(
      formatFitnessReadout({ date: '2025-11-07', ...DAY }, TODAY, LABELS).date,
    ).toBe('7 lis 2025');
  });

  it('shows a dash for every field of a day without values', () => {
    expect(
      formatFitnessReadout(
        {
          date: '2026-02-14',
          fitness: null,
          fatigue: null,
          form: null,
          load: null,
        },
        TODAY,
        LABELS,
      ),
    ).toEqual({
      date: '14 lut',
      fitness: '–',
      fatigue: '–',
      form: '–',
      load: '–',
    });
  });

  it.each([
    [-12, '-12'],
    [0, '0'],
  ])('signs a Form of %i as %s', (form, label) => {
    expect(
      formatFitnessReadout({ date: TODAY, ...DAY, form }, TODAY, LABELS).form,
    ).toBe(label);
  });

  it("shows a rest day's load as 0", () => {
    expect(
      formatFitnessReadout({ date: TODAY, ...DAY, load: 0 }, TODAY, LABELS)
        .load,
    ).toBe('0');
  });
});
