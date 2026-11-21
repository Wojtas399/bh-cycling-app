import type { FitnessDay } from '../fitness';
import { fitnessChartGeometry, fitnessDayIndexAt } from '../fitnessChart';
import { addDays, fromLocalDateString, toLocalDateString } from '../localDate';

const FRIDAY_6_NOV_2026 = '2026-11-06';
const TODAY = FRIDAY_6_NOV_2026;

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

const Y_LABEL_GUTTER_PT = 28;
const PLOT_WIDTH_PT = 420;
const ROOM_FOR_TOP_LABEL_PT = 6;
const PANELS_HEIGHT_PT = 100;
const PANEL_GAP_PT = 16;
const X_LABEL_STRIP_PT = 20;
const SIZE = {
  width: Y_LABEL_GUTTER_PT + PLOT_WIDTH_PT,
  height:
    ROOM_FOR_TOP_LABEL_PT + PANELS_HEIGHT_PT + PANEL_GAP_PT + X_LABEL_STRIP_PT,
};
const TOP_PANEL_HEIGHT_PT = 64;
const TOP_PANEL_BOTTOM_Y = 70;

function localDateDaysFromToday(offset: number): string {
  return toLocalDateString(addDays(fromLocalDateString(TODAY), offset));
}

type Values = Partial<Omit<FitnessDay, 'date'>>;

const STEADY_DAY = { fitness: 40, fatigue: 45, load: 60 };

function daysEndingTodayOverASteadyDay(
  count: number,
  values: (index: number) => Values = () => ({}),
) {
  return Array.from({ length: count }, (_, index): FitnessDay => {
    const {
      fitness = STEADY_DAY.fitness,
      fatigue = STEADY_DAY.fatigue,
      load = STEADY_DAY.load,
      ...rest
    } = values(index);
    const form =
      fitness === null || fatigue === null ? null : fitness - fatigue;

    return {
      date: localDateDaysFromToday(index + 1 - count),
      fitness,
      fatigue,
      form,
      load,
      ...rest,
    };
  });
}

function separateRunsOfPoints(d: string): { x: number; y: number }[][] {
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
    const geometry = fitnessChartGeometry(
      daysEndingTodayOverASteadyDay(42),
      '6w',
      SIZE,
      LABELS,
    );

    const [fitness] = separateRunsOfPoints(geometry.top.fitness);

    expect(geometry.plotWidth).toBe(420);
    expect(fitness).toHaveLength(42);
    expect(fitness[0].x).toBeCloseTo(5);
    expect(fitness[1].x).toBeCloseTo(15);
    expect(fitness[41].x).toBeCloseTo(415);
  });

  const NO_VALUES: Values = { fitness: null, fatigue: null, load: null };

  it('breaks every line at days without values', () => {
    const daysTenToTwelveWithoutValues = daysEndingTodayOverASteadyDay(
      42,
      index => (index >= 10 && index <= 12 ? NO_VALUES : {}),
    );

    const { top, bottom } = fitnessChartGeometry(
      daysTenToTwelveWithoutValues,
      '6w',
      SIZE,
      LABELS,
    );

    for (const line of [top.fitness, top.fatigue, bottom.form]) {
      const [before, after] = separateRunsOfPoints(line);

      expect(separateRunsOfPoints(line)).toHaveLength(2);
      expect(before).toHaveLength(10);
      expect(before[9].x).toBeCloseTo(95);
      expect(after).toHaveLength(29);
      expect(after[0].x).toBeCloseTo(135);
    }
  });

  it('draws nothing for days before the history', () => {
    const newAthleteWithValuesOnTheLast5Days = daysEndingTodayOverASteadyDay(
      42,
      index => (index < 37 ? NO_VALUES : {}),
    );

    const [fitness, ...rest] = separateRunsOfPoints(
      fitnessChartGeometry(
        newAthleteWithValuesOnTheLast5Days,
        '6w',
        SIZE,
        LABELS,
      ).top.fitness,
    );

    expect(rest).toEqual([]);
    expect(fitness).toHaveLength(5);
    expect(fitness[0].x).toBeCloseTo(375);
  });

  function labelsTopDownAndYByLabel(ticks: { y: number; label: string }[]) {
    return {
      labels: ticks.map(tick => tick.label),
      y: Object.fromEntries(ticks.map(tick => [tick.label, tick.y])),
    };
  }

  it("scales Form from at least -10 to +10 around a zero line, in the 36 pt under the top panel's 64 pt and the gap", () => {
    const geometry = fitnessChartGeometry(
      daysEndingTodayOverASteadyDay(42),
      '6w',
      SIZE,
      LABELS,
    );
    const { labels, y } = labelsTopDownAndYByLabel(geometry.bottom.ticks);

    expect(labels).toEqual(['+10', '0', '-10']);
    expect(y['+10']).toBeCloseTo(86);
    expect(y['-10']).toBeCloseTo(122);
    expect(geometry.bottom.zeroY).toBeCloseTo(104);
  });

  it('widens the Form scale in steps of 10 to cover the slice', () => {
    const formMinus23 = { fitness: 40, fatigue: 63 };
    const formPlus7 = { fitness: 50, fatigue: 43 };
    const days = daysEndingTodayOverASteadyDay(42, index => {
      if (index === 5) return formMinus23;

      if (index === 6) return formPlus7;

      return {};
    });

    const geometry = fitnessChartGeometry(days, '6w', SIZE, LABELS);
    const { labels, y } = labelsTopDownAndYByLabel(geometry.bottom.ticks);
    const form = separateRunsOfPoints(geometry.bottom.form)[0];

    expect(labels).toEqual(['+10', '0', '-30']);
    expect(geometry.bottom.zeroY).toBeCloseTo(y['0']);
    expect(form[5].y).toBeGreaterThan(y['0']);
    expect(form[5].y).toBeLessThanOrEqual(y['-30']);
    expect(form[6].y).toBeLessThan(y['0']);
    expect(form[6].y).toBeGreaterThanOrEqual(y['+10']);
  });

  it('scales the top panel from 0 past the highest value, in steps of 25: Fatigue 120 with headroom over it tops the scale at 150', () => {
    const days = daysEndingTodayOverASteadyDay(42, index =>
      index === 30 ? { fatigue: 120 } : {},
    );

    const geometry = fitnessChartGeometry(days, '6w', SIZE, LABELS);
    const { labels, y } = labelsTopDownAndYByLabel(geometry.top.ticks);
    const fatigue = separateRunsOfPoints(geometry.top.fatigue)[0];

    expect(labels).toEqual(['150', '75', '0']);
    expect(y['150']).toBeCloseTo(ROOM_FOR_TOP_LABEL_PT);
    expect(y['0']).toBeCloseTo(TOP_PANEL_BOTTOM_Y);
    expect(fatigue[30].y).toBeGreaterThan(y['150']);
    expect(fatigue[30].y).toBeLessThan(y['75']);
  });

  it('keeps the top scale at least 25 for low values, its half tick rounded to a whole label', () => {
    const days = daysEndingTodayOverASteadyDay(42, () => ({
      fitness: 3,
      fatigue: 8,
    }));

    const { labels } = labelsTopDownAndYByLabel(
      fitnessChartGeometry(days, '6w', SIZE, LABELS).top.ticks,
    );

    expect(labels).toEqual(['25', '13', '0']);
  });

  function eachBarCentreTopBottomAndWidth(d: string) {
    return separateRunsOfPoints(d).map(points => {
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

  it('draws a load bar about 60% of its slot wide for each day with load, none for a rest day or no data', () => {
    const restDayIndex = 3;
    const dayWithoutValuesIndex = 4;
    const days = daysEndingTodayOverASteadyDay(42, index => {
      if (index === restDayIndex) return { load: 0 };

      if (index === dayWithoutValuesIndex) return NO_VALUES;

      return {};
    });

    const drawn = eachBarCentreTopBottomAndWidth(
      fitnessChartGeometry(days, '6w', SIZE, LABELS).top.bars,
    );

    expect(drawn).toHaveLength(40);
    expect(drawn[2].centre).toBeCloseTo(25);
    expect(drawn[3].centre).toBeCloseTo(55);
    expect(drawn[0].width).toBeCloseTo(6);
  });

  it('scales load bars on their own, in the lower 55% of the top panel', () => {
    const days = daysEndingTodayOverASteadyDay(42, index => {
      if (index === 10) return { load: 300 };

      if (index === 11) return { load: 150 };

      return {};
    });

    const drawn = eachBarCentreTopBottomAndWidth(
      fitnessChartGeometry(days, '6w', SIZE, LABELS).top.bars,
    );
    const tallest = drawn[10];
    const half = drawn[11];

    expect(tallest.bottom).toBeCloseTo(TOP_PANEL_BOTTOM_Y);
    expect(tallest.top).toBeCloseTo(
      TOP_PANEL_BOTTOM_Y - 0.55 * TOP_PANEL_HEIGHT_PT,
    );
    expect(half.bottom).toBeCloseTo(TOP_PANEL_BOTTOM_Y);
    expect(half.top).toBeCloseTo(
      TOP_PANEL_BOTTOM_Y - 0.55 * (TOP_PANEL_HEIGHT_PT / 2),
    );
  });

  it('keeps a load bar at least 1 pt wide on a year, whose slots on 420 pt are about 1.15 pt', () => {
    const drawn = eachBarCentreTopBottomAndWidth(
      fitnessChartGeometry(
        daysEndingTodayOverASteadyDay(365),
        '1y',
        SIZE,
        LABELS,
      ).top.bars,
    );

    expect(drawn[0].width).toBeCloseTo(1);
  });

  it("dots today's end of each line at the right edge", () => {
    const geometry = fitnessChartGeometry(
      daysEndingTodayOverASteadyDay(42),
      '6w',
      SIZE,
      LABELS,
    );
    const lastPoint = (d: string) => separateRunsOfPoints(d)[0][41];

    expect(geometry.dots).toEqual([
      { series: 'fitness', ...lastPoint(geometry.top.fitness) },
      { series: 'fatigue', ...lastPoint(geometry.top.fatigue) },
      { series: 'form', ...lastPoint(geometry.bottom.form) },
    ]);
    expect(geometry.dots[0].x).toBeCloseTo(415);
  });

  it('dots only the series that have a value today', () => {
    const days = daysEndingTodayOverASteadyDay(42, index =>
      index === 41 ? { fatigue: null, load: null } : {},
    );

    const geometry = fitnessChartGeometry(days, '6w', SIZE, LABELS);

    expect(geometry.dots.map(dot => dot.series)).toEqual(['fitness']);
  });

  it('marks each Monday as day.month on 6 tygodni: from Saturday 26 Sep, the first is 28 Sep, the third day', () => {
    const { xTicks } = fitnessChartGeometry(
      daysEndingTodayOverASteadyDay(42),
      '6w',
      SIZE,
      LABELS,
    );

    expect(xTicks.map(tick => tick.label)).toEqual([
      '28.9',
      '5.10',
      '12.10',
      '19.10',
      '26.10',
      '2.11',
    ]);
    expect(xTicks[0].x).toBeCloseTo(25);
  });

  it('marks each month start by its short name on 3 miesiące, 8 Aug to 6 Nov', () => {
    const days = daysEndingTodayOverASteadyDay(91);

    const { xTicks } = fitnessChartGeometry(days, '3m', SIZE, LABELS);
    const september = days.findIndex(day => day.date === '2026-09-01');

    expect(xTicks.map(tick => tick.label)).toEqual(['wrz', 'paź', 'lis']);
    expect(xTicks[0].x).toBeCloseTo((420 / 91) * (september + 0.5));
  });

  it('marks every other month start from January on rok, 7 Nov 2025 to 6 Nov 2026', () => {
    const { xTicks } = fitnessChartGeometry(
      daysEndingTodayOverASteadyDay(365),
      '1y',
      SIZE,
      LABELS,
    );

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
  const days = daysEndingTodayOverASteadyDay(42);
  const { slotWidth } = fitnessChartGeometry(days, '6w', SIZE, LABELS);

  const dayUnderTouchAt = (x: number) =>
    fitnessDayIndexAt(x, slotWidth, days.length);

  it('finds the first day across its whole slot', () => {
    expect(dayUnderTouchAt(0)).toBe(0);
    expect(dayUnderTouchAt(9.9)).toBe(0);
    expect(dayUnderTouchAt(10)).toBe(1);
  });

  it('finds today in the last slot', () => {
    expect(dayUnderTouchAt(415)).toBe(41);
  });

  it('holds to the first day left of the plot', () => {
    expect(dayUnderTouchAt(-20)).toBe(0);
  });

  it('holds to today right of the plot, over the labels', () => {
    expect(dayUnderTouchAt(430)).toBe(41);
    expect(dayUnderTouchAt(1000)).toBe(41);
  });

  it('finds a day before the history, which has no values', () => {
    const newAthlete = daysEndingTodayOverASteadyDay(42, index =>
      index < 37 ? { fitness: null, fatigue: null, load: null } : {},
    );

    const index = fitnessDayIndexAt(55, slotWidth, newAthlete.length);

    expect(index).toBe(5);
    expect(newAthlete[index]).toMatchObject({
      date: localDateDaysFromToday(-36),
      fitness: null,
    });
  });
});
