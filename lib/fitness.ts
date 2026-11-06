import type { IntervalsWellness, IntervalsWellnessDay } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';
import type { NoteDateLabels } from './noteDates';

/** One day's Fitness, Fatigue and Form, as whole numbers. */
export interface FitnessValues {
  fitness: number;
  fatigue: number;
  /** Fitness − Fatigue, from the rounded values. */
  form: number;
}

/**
 * A Wellness Entry's Fitness (`ctl`) and Fatigue (`atl`), rounded, and Form
 * from those rounded values, as the intervals.icu web app derives it. `null`
 * unless both are there: a missing value is no data, never `0`.
 */
export function toFitnessValues({
  ctl,
  atl,
}: Pick<IntervalsWellness, 'ctl' | 'atl'>): FitnessValues | null {
  if (!isFiniteNumber(ctl) || !isFiniteNumber(atl)) return null;

  const fitness = Math.round(ctl);
  const fatigue = Math.round(atl);

  return { fitness, fatigue, form: fitness - fatigue };
}

/**
 * Form as an absolute number with its sign: `+5`, `-12`, and `0` with none.
 * intervals.icu's "Form as a percentage" setting is ignored.
 */
export function formatForm(form: number): string {
  return form > 0 ? `+${form}` : `${form}`;
}

/** One day on the Fitness chart. */
export interface FitnessDay {
  date: LocalDateString;
  /** Whole. */
  fitness: number | null;
  /** Whole. */
  fatigue: number | null;
  /** `null` when either Fitness or Fatigue is. */
  form: number | null;
  /** Whole. `null` only on a day without values. */
  load: number | null;
}

/**
 * Whether a day has values: both Fitness and Fatigue. A day without them
 * draws nothing, and its load is no data rather than a rest day.
 */
export function hasFitnessValues({ fitness, fatigue }: FitnessDay): boolean {
  return fitness !== null && fatigue !== null;
}

/** The chart's ranges, shortest first: 6 tygodni, 3 miesiące, rok. */
export const FITNESS_RANGES = ['6w', '3m', '1y'] as const;

export type FitnessRange = (typeof FITNESS_RANGES)[number];

/** The range the chart opens on. */
export const DEFAULT_FITNESS_RANGE: FitnessRange = '3m';

/** The days each range shows, ending today. */
const RANGE_DAYS: Record<FitnessRange, number> = {
  '6w': 42,
  '3m': 91,
  '1y': 365,
};

/** How many days the chart reads: its longest range, ending today. */
export const FITNESS_HISTORY_DAYS = RANGE_DAYS['1y'];

/**
 * The last days of the year (see `toFitnessDays`) that `range` shows. The
 * year has a day for every date, so a range always spans its full length,
 * however short the history.
 */
export function sliceFitnessRange(
  days: FitnessDay[],
  range: FitnessRange,
): FitnessDay[] {
  return days.slice(-RANGE_DAYS[range]);
}

/** The Wellness fields the chart reads: the date, Fitness, Fatigue and load. */
export const FITNESS_FIELDS = 'id,ctl,atl,ctlLoad';

/** The year the chart reads: `FITNESS_HISTORY_DAYS` ending `today`. */
export function fitnessHistoryWindow(today: LocalDateString): {
  oldest: LocalDateString;
  newest: LocalDateString;
} {
  const oldest = addDays(fromLocalDateString(today), 1 - FITNESS_HISTORY_DAYS);

  return { oldest: toLocalDateString(oldest), newest: today };
}

/**
 * The year of days ending `today` (see `fitnessHistoryWindow`), oldest first,
 * from a range read's rows. Rows outside it are ignored, and a day without a
 * row is a day without values. Fitness and Fatigue are rounded, and Form and
 * load come only on a day with values (see `toFitnessValues`), where a
 * missing load is a rest day's `0`.
 */
export function toFitnessDays(
  rows: IntervalsWellnessDay[],
  today: LocalDateString,
): FitnessDay[] {
  const rowsByDate = new Map(rows.map(row => [row.id, row]));
  const oldest = fromLocalDateString(fitnessHistoryWindow(today).oldest);

  return Array.from({ length: FITNESS_HISTORY_DAYS }, (_, index) => {
    const date = toLocalDateString(addDays(oldest, index));

    return toFitnessDay(date, rowsByDate.get(date));
  });
}

function toFitnessDay(
  date: LocalDateString,
  row: IntervalsWellnessDay | undefined,
): FitnessDay {
  const values = row ? toFitnessValues(row) : null;

  if (values) return { date, ...values, load: wholeOrNull(row?.ctlLoad) ?? 0 };

  return {
    date,
    fitness: wholeOrNull(row?.ctl),
    fatigue: wholeOrNull(row?.atl),
    form: null,
    load: null,
  };
}

function wholeOrNull(value: number | null | undefined): number | null {
  return isFiniteNumber(value) ? Math.round(value) : null;
}

/** A day on the chart's readout row, every field ready to show. */
export type FitnessReadout = Record<
  'date' | 'fitness' | 'fatigue' | 'form' | 'load',
  string
>;

export interface FitnessReadoutLabels extends Pick<
  NoteDateLabels,
  'monthsShort'
> {
  /** The date of `today` itself: "Dziś". */
  today: string;
}

/** What the readout shows for a missing value: no data, never `0`. */
const MISSING = '–';

/**
 * `day` as the readout shows it: "Dziś" for `today`, else the day and short
 * month ("3 lis"), with the year for a day outside today's ("7 lis 2025").
 * Form takes its sign (see `formatForm`), and a missing value is a dash.
 */
export function formatFitnessReadout(
  { date, fitness, fatigue, form, load }: FitnessDay,
  today: LocalDateString,
  labels: FitnessReadoutLabels,
): FitnessReadout {
  return {
    date: date === today ? labels.today : formatDate(date, today, labels),
    fitness: fitness === null ? MISSING : `${fitness}`,
    fatigue: fatigue === null ? MISSING : `${fatigue}`,
    form: form === null ? MISSING : formatForm(form),
    load: load === null ? MISSING : `${load}`,
  };
}

function formatDate(
  date: LocalDateString,
  today: LocalDateString,
  { monthsShort }: FitnessReadoutLabels,
): string {
  const day = fromLocalDateString(date);
  const dayMonth = `${day.getDate()} ${monthsShort[day.getMonth()]}`;

  return day.getFullYear() === fromLocalDateString(today).getFullYear()
    ? dayMonth
    : `${dayMonth} ${day.getFullYear()}`;
}
