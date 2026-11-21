import type {
  IntervalsField,
  IntervalsWellness,
  IntervalsWellnessDay,
} from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';
import type { NoteDateLabels } from './noteDates';

export interface FitnessValues {
  fitness: number;
  fatigue: number;
  form: number;
}

export function toFitnessValues({
  ctl,
  atl,
}: Pick<IntervalsWellness, 'ctl' | 'atl'>): FitnessValues | null {
  if (!isFiniteNumber(ctl) || !isFiniteNumber(atl)) return null;

  const fitness = Math.round(ctl);
  const fatigue = Math.round(atl);

  return { fitness, fatigue, form: fitness - fatigue };
}

export function formatForm(form: number): string {
  return form > 0 ? `+${form}` : `${form}`;
}

export interface FitnessDay {
  date: LocalDateString;
  fitness: number | null;
  fatigue: number | null;
  form: number | null;
  load: number | null;
}

export function hasFitnessValues({ fitness, fatigue }: FitnessDay): boolean {
  return fitness !== null && fatigue !== null;
}

export const FITNESS_RANGES = ['6w', '3m', '1y'] as const;

export type FitnessRange = (typeof FITNESS_RANGES)[number];

export const DEFAULT_FITNESS_RANGE: FitnessRange = '3m';

const RANGE_DAYS_ENDING_TODAY: Record<FitnessRange, number> = {
  '6w': 42,
  '3m': 91,
  '1y': 365,
};

export const FITNESS_HISTORY_DAYS = RANGE_DAYS_ENDING_TODAY['1y'];

export function sliceFitnessRange(
  days: FitnessDay[],
  range: FitnessRange,
): FitnessDay[] {
  return days.slice(-RANGE_DAYS_ENDING_TODAY[range]);
}

export const FITNESS_FIELDS: readonly IntervalsField<IntervalsWellnessDay>[] = [
  'id',
  'ctl',
  'atl',
  'ctlLoad',
];

export function fitnessHistoryWindow(today: LocalDateString): {
  oldest: LocalDateString;
  newest: LocalDateString;
} {
  const oldest = addDays(fromLocalDateString(today), 1 - FITNESS_HISTORY_DAYS);

  return { oldest: toLocalDateString(oldest), newest: today };
}

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

  if (!row || !values) {
    return { date, fitness: null, fatigue: null, form: null, load: null };
  }

  const { ctlLoad } = row;

  return {
    date,
    ...values,
    load: isFiniteNumber(ctlLoad) ? Math.round(ctlLoad) : 0,
  };
}

export type FitnessReadout = Record<
  'date' | 'fitness' | 'fatigue' | 'form' | 'load',
  string
>;

export interface FitnessLabels extends Pick<NoteDateLabels, 'monthsShort'> {
  today: string;
}

const MISSING_VALUE_DASH = '–';

export function formatFitnessReadout(
  day: FitnessDay,
  today: LocalDateString,
  labels: FitnessLabels,
): FitnessReadout {
  const { date, load } = day;

  return {
    date: date === today ? labels.today : formatDate(date, today, labels),
    ...formatValues(day),
    load: load === null ? MISSING_VALUE_DASH : `${load}`,
  };
}

export function fitnessReadoutDay(
  shown: FitnessDay[],
  touchedIndexInShown: number | null,
  today: FitnessDay,
): FitnessDay {
  return (
    (touchedIndexInShown === null ? undefined : shown[touchedIndexInShown]) ??
    today
  );
}

export type ShownFitnessValues = Record<keyof FitnessValues, string>;

export interface FitnessCardLabels {
  values: (shown: ShownFitnessValues) => string;
  noValue: string;
}

export interface FitnessCardContent {
  values: ShownFitnessValues | null;
  label: string;
}

export function formatFitnessCard(
  values: FitnessValues | null,
  labels: FitnessCardLabels,
): FitnessCardContent {
  if (values === null) return { values: null, label: labels.noValue };

  const shown = formatValues(values);

  return { values: shown, label: labels.values(shown) };
}

function formatValues({
  fitness,
  fatigue,
  form,
}: Record<keyof FitnessValues, number | null>): ShownFitnessValues {
  return {
    fitness: fitness === null ? MISSING_VALUE_DASH : `${fitness}`,
    fatigue: fatigue === null ? MISSING_VALUE_DASH : `${fatigue}`,
    form: form === null ? MISSING_VALUE_DASH : formatForm(form),
  };
}

function formatDate(
  date: LocalDateString,
  today: LocalDateString,
  { monthsShort }: FitnessLabels,
): string {
  const day = fromLocalDateString(date);
  const dayMonth = `${day.getDate()} ${monthsShort[day.getMonth()]}`;

  return day.getFullYear() === fromLocalDateString(today).getFullYear()
    ? dayMonth
    : `${dayMonth} ${day.getFullYear()}`;
}
