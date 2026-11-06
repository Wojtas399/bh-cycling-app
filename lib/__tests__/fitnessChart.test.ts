import type { FitnessDay } from '../fitness';
import { fitnessChartGeometry, fitnessDayIndexAt } from '../fitnessChart';
import { addDays, fromLocalDateString, toLocalDateString } from '../localDate';

// A Friday.
const TODAY = '2026-11-06';

const MONTHS_SHORT = [
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
];

const LABELS = { today: 'Dziś', monthsShort: MONTHS_SHORT };

// A 28 pt label gutter leaves a 420 pt plot: 10 pt a slot over 42 days. The
// height leaves 100 pt for the panels once the room for the top label (6 pt),
// the gap between the panels (16 pt) and the x axis (20 pt) are out.
const SIZE = { width: 448, height: 142 };

/** The local date `offset` days from `TODAY`. */
function dayFrom(offset: number): string {
  return toLocalDateString(addDays(fromLocalDateString(TODAY), offset));
}

type Values = Partial<Omit<FitnessDay, 'date'>>;

/**
 * `count` days ending today, oldest first, each with `values(index)` over a
 * steady day (Fitness 40, Fatigue 45, Form -5, load 60).
 */
function slice(count: number, values: (index: number) => Values = () => ({})) {
  return Array.from({ length: count }, (_, index): FitnessDay => {
    const { fitness = 40, fatigue = 45, load = 60, ...rest } = values(index);
    const form =
      fitness === null || fatigue === null ? null : fitness - fatigue;

    return {
      date: dayFrom(index + 1 - count),
      fitness,
      fatigue,
      form,
      load,
      ...rest,
    };
  });
}

/** The separate runs of points a path draws, from its M, L and Z commands. */
function runs(d: string): { x: number; y: number }[][] {
  const result: { x: number; y: number }[][] = [];

  for (const [, command, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (command === 'Z') continue;

    const [x, y] = args
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (command === 'M') result.push([]);

    result[result.length - 1].push({ x, y });
  }

  return result;
}

describe('fitnessChartGeometry', () => {
  it('gives each day one slot across the plot, its point at the centre', () => {
    const geometry = fitnessChartGeometry(slice(42), '6w', SIZE, LABELS);

    const [fitness] = runs(geometry.top.fitness);

    expect(geometry.plotWidth).toBe(420);
    expect(fitness).toHaveLength(42);
    expect(fitness[0].x).toBeCloseTo(5);
    expect(fitness[1].x).toBeCloseTo(15);
    expect(fitness[41].x).toBeCloseTo(415);
  });

  /** A day without values: no data, never `0`. */
  const NO_VALUES: Values = { fitness: null, fatigue: null, load: null };

  it('breaks every line at days without values', () => {
    // Days 10–12 have no values.
    const days = slice(42, index =>
      index >= 10 && index <= 12 ? NO_VALUES : {},
    );

    const { top, bottom } = fitnessChartGeometry(days, '6w', SIZE, LABELS);

    for (const line of [top.fitness, top.fatigue, bottom.form]) {
      const [before, after] = runs(line);

      expect(runs(line)).toHaveLength(2);
      expect(before).toHaveLength(10);
      expect(before[9].x).toBeCloseTo(95);
      expect(after).toHaveLength(29);
      expect(after[0].x).toBeCloseTo(135);
    }
  });

  it('draws nothing for days before the history', () => {
    // A new athlete: values only on the last 5 days.
    const days = slice(42, index => (index < 37 ? NO_VALUES : {}));

    const [fitness, ...rest] = runs(
      fitnessChartGeometry(days, '6w', SIZE, LABELS).top.fitness,
    );

    expect(rest).toEqual([]);
    expect(fitness).toHaveLength(5);
    expect(fitness[0].x).toBeCloseTo(375);
  });

  /** The labels of a panel's ticks, top down, and the y of each by label. */
  function ticksOf(ticks: { y: number; label: string }[]) {
    return {
      labels: ticks.map(tick => tick.label),
      y: Object.fromEntries(ticks.map(tick => [tick.label, tick.y])),
    };
  }

  it('scales Form from at least -10 to +10 around a zero line', () => {
    const geometry = fitnessChartGeometry(slice(42), '6w', SIZE, LABELS);
    const { labels, y } = ticksOf(geometry.bottom.ticks);

    // The bottom panel's 36 pt sit under the top one's 64 pt and the gap.
    expect(labels).toEqual(['+10', '0', '-10']);
    expect(y['+10']).toBeCloseTo(86);
    expect(y['-10']).toBeCloseTo(122);
    expect(geometry.bottom.zeroY).toBeCloseTo(104);
  });

  it('widens the Form scale in steps of 10 to cover the slice', () => {
    const days = slice(42, index => {
      if (index === 5) return { fitness: 40, fatigue: 63 }; // Form -23

      if (index === 6) return { fitness: 50, fatigue: 43 }; // Form +7

      return {};
    });

    const geometry = fitnessChartGeometry(days, '6w', SIZE, LABELS);
    const { labels, y } = ticksOf(geometry.bottom.ticks);
    const form = runs(geometry.bottom.form)[0];

    expect(labels).toEqual(['+10', '0', '-30']);
    expect(geometry.bottom.zeroY).toBeCloseTo(y['0']);
    expect(form[5].y).toBeGreaterThan(y['0']);
    expect(form[5].y).toBeLessThanOrEqual(y['-30']);
    expect(form[6].y).toBeLessThan(y['0']);
    expect(form[6].y).toBeGreaterThanOrEqual(y['+10']);
  });

  it('scales the top panel from 0 past the highest value, in steps of 25', () => {
    // Fatigue 120 on one day; with headroom over it, the scale tops at 150.
    const days = slice(42, index => (index === 30 ? { fatigue: 120 } : {}));

    const geometry = fitnessChartGeometry(days, '6w', SIZE, LABELS);
    const { labels, y } = ticksOf(geometry.top.ticks);
    const fatigue = runs(geometry.top.fatigue)[0];

    // The top panel's 64 pt start under room for the top label.
    expect(labels).toEqual(['150', '75', '0']);
    expect(y['150']).toBeCloseTo(6);
    expect(y['0']).toBeCloseTo(70);
    expect(fatigue[30].y).toBeGreaterThan(y['150']);
    expect(fatigue[30].y).toBeLessThan(y['75']);
  });

  it('keeps the top scale at least 25 for low values', () => {
    const days = slice(42, () => ({ fitness: 3, fatigue: 8 }));

    const { labels } = ticksOf(
      fitnessChartGeometry(days, '6w', SIZE, LABELS).top.ticks,
    );

    expect(labels).toEqual(['25', '13', '0']);
  });

  /** Each bar a path draws: its centre, top, bottom and width. */
  function bars(d: string) {
    return runs(d).map(points => {
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);

      return {
        centre: (Math.min(...xs) + Math.max(...xs)) / 2,
        top: Math.min(...ys),
        bottom: Math.max(...ys),
        width: Math.max(...xs) - Math.min(...xs),
      };
    });
  }

  it('draws a load bar for each day with load, none for a rest day or no data', () => {
    // Day 3 is a rest day, day 4 has no values.
    const days = slice(42, index => {
      if (index === 3) return { load: 0 };

      if (index === 4) return NO_VALUES;

      return {};
    });

    const drawn = bars(fitnessChartGeometry(days, '6w', SIZE, LABELS).top.bars);

    expect(drawn).toHaveLength(40);
    expect(drawn[2].centre).toBeCloseTo(25);
    expect(drawn[3].centre).toBeCloseTo(55);
    // About 60% of the 10 pt slot.
    expect(drawn[0].width).toBeCloseTo(6);
  });

  it('scales load bars on their own, in the lower 55% of the top panel', () => {
    const days = slice(42, index => {
      if (index === 10) return { load: 300 };

      if (index === 11) return { load: 150 };

      return {};
    });

    const drawn = bars(fitnessChartGeometry(days, '6w', SIZE, LABELS).top.bars);
    const tallest = drawn[10];
    const half = drawn[11];

    // The top panel's 64 pt end at 70: the tallest bar takes 55% of them.
    expect(tallest.bottom).toBeCloseTo(70);
    expect(tallest.top).toBeCloseTo(70 - 0.55 * 64);
    expect(half.bottom).toBeCloseTo(70);
    expect(half.top).toBeCloseTo(70 - 0.55 * 32);
  });

  it('keeps a load bar at least 1 pt wide on a year', () => {
    // A year's slots on 420 pt are about 1.15 pt each.
    const drawn = bars(
      fitnessChartGeometry(slice(365), '1y', SIZE, LABELS).top.bars,
    );

    expect(drawn[0].width).toBeCloseTo(1);
  });

  it("dots today's end of each line at the right edge", () => {
    const geometry = fitnessChartGeometry(slice(42), '6w', SIZE, LABELS);
    const lastPoint = (d: string) => runs(d)[0][41];

    expect(geometry.dots).toEqual([
      { series: 'fitness', ...lastPoint(geometry.top.fitness) },
      { series: 'fatigue', ...lastPoint(geometry.top.fatigue) },
      { series: 'form', ...lastPoint(geometry.bottom.form) },
    ]);
    expect(geometry.dots[0].x).toBeCloseTo(415);
  });

  it('dots only the series that have a value today', () => {
    const days = slice(42, index =>
      index === 41 ? { fatigue: null, load: null } : {},
    );

    const geometry = fitnessChartGeometry(days, '6w', SIZE, LABELS);

    expect(geometry.dots.map(dot => dot.series)).toEqual(['fitness']);
  });

  it('marks each Monday as day.month on 6 tygodni', () => {
    // 26 Sep (a Saturday) to 6 Nov.
    const { xTicks } = fitnessChartGeometry(slice(42), '6w', SIZE, LABELS);

    expect(xTicks.map(tick => tick.label)).toEqual([
      '28.9',
      '5.10',
      '12.10',
      '19.10',
      '26.10',
      '2.11',
    ]);
    // 28 Sep is the third day.
    expect(xTicks[0].x).toBeCloseTo(25);
  });

  it('marks each month start by its short name on 3 miesiące', () => {
    // 8 Aug to 6 Nov.
    const days = slice(91);

    const { xTicks } = fitnessChartGeometry(days, '3m', SIZE, LABELS);
    const september = days.findIndex(day => day.date === '2026-09-01');

    expect(xTicks.map(tick => tick.label)).toEqual(['wrz', 'paź', 'lis']);
    expect(xTicks[0].x).toBeCloseTo((420 / 91) * (september + 0.5));
  });

  it('marks every other month start on rok', () => {
    // 7 Nov 2025 to 6 Nov 2026: the same months stay marked as days pass.
    const { xTicks } = fitnessChartGeometry(slice(365), '1y', SIZE, LABELS);

    expect(xTicks.map(tick => tick.label)).toEqual([
      'sty',
      'mar',
      'maj',
      'lip',
      'wrz',
      'lis',
    ]);
  });
});

describe('fitnessDayIndexAt', () => {
  const days = slice(42);
  const { slotWidth } = fitnessChartGeometry(days, '6w', SIZE, LABELS);

  /** The day under a touch at `x` on the 10 pt slots. */
  const dayAt = (x: number) => fitnessDayIndexAt(x, slotWidth, days.length);

  it('finds the first day across its whole slot', () => {
    expect(dayAt(0)).toBe(0);
    expect(dayAt(9.9)).toBe(0);
    expect(dayAt(10)).toBe(1);
  });

  it('finds today in the last slot', () => {
    expect(dayAt(415)).toBe(41);
  });

  it('holds to the first day left of the plot', () => {
    expect(dayAt(-20)).toBe(0);
  });

  it('holds to today right of the plot, over the labels', () => {
    expect(dayAt(430)).toBe(41);
    expect(dayAt(1000)).toBe(41);
  });

  it('finds a day before the history, which has no values', () => {
    const newAthlete = slice(42, index =>
      index < 37 ? { fitness: null, fatigue: null, load: null } : {},
    );

    const index = fitnessDayIndexAt(55, slotWidth, newAthlete.length);

    expect(index).toBe(5);
    expect(newAthlete[index]).toMatchObject({
      date: dayFrom(-36),
      fitness: null,
    });
  });
});
