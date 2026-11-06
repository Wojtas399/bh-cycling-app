import {
  type FitnessDay,
  type FitnessLabels,
  type FitnessRange,
  formatForm,
} from './fitness';
import { fromLocalDateString } from './localDate';

/** The y labels' gutter, right of the plot. */
const Y_GUTTER = 28;
/** Room over the top panel, so its top label isn't cut off. */
const TOP_LABEL_ROOM = 6;
/** The strip under the panels that holds the x labels. */
const X_AXIS = 20;
/** The gap between the two panels. */
const PANEL_GAP = 16;
/** The top panel's share of the panels' height; the bottom gets the rest. */
const TOP_SHARE = 0.64;
/** The top scale grows in steps of 25, and spans at least 0 to 25. */
const TOP_STEP = 25;
/** Room over the top panel's highest value, so a line never runs along the top. */
const TOP_HEADROOM = 1.08;
/** The load bars' share of the top panel's height, from its bottom. */
const BAR_SHARE = 0.55;
/** A load bar's share of its day's slot, and its least width. */
const BAR_WIDTH = 0.6;
const BAR_MIN_WIDTH = 1;
/** Form's scale grows in steps of 10, and spans at least -10 to +10. */
const FORM_STEP = 10;

/** Where the chart's static parts go, in the chart's own coordinates. */
export interface FitnessChartGeometry {
  /** The plot's width; the y labels sit right of it. */
  plotWidth: number;
  /** One day's slot width (see `fitnessSlotCentre`, `fitnessDayIndexAt`). */
  slotWidth: number;
  /** The bottom panel's bottom edge: the cursor spans both panels to here. */
  plotHeight: number;
  /** The top panel: Fitness and Fatigue over the load bars. */
  top: {
    /** SVG paths, broken at days without a value. */
    fitness: string;
    fatigue: string;
    /** Max, half and 0, top down. */
    ticks: FitnessChartTick[];
    /**
     * SVG path of the daily load bars, on their own scale: the slice's
     * highest load fills the bars' share of the panel.
     */
    bars: string;
  };
  /** The bottom panel: Form around zero. */
  bottom: {
    /** SVG path, broken at days without Form. */
    form: string;
    /** Max, 0 and min, top down, labelled with Form's sign. */
    ticks: FitnessChartTick[];
    /** The zero line's y. */
    zeroY: number;
  };
  /** Today's end of each line, for the series that have a value today. */
  dots: FitnessChartDot[];
  /** The shared time axis's labels, each at its day's slot centre. */
  xTicks: { x: number; label: string }[];
}

/** A line's series. */
export type FitnessChartSeries = 'fitness' | 'fatigue' | 'form';

export interface FitnessChartDot {
  series: FitnessChartSeries;
  x: number;
  y: number;
}

/** A y-axis tick: a grid line and its label. */
export interface FitnessChartTick {
  y: number;
  label: string;
}

/**
 * The chart for `days`, a range's slice, drawn into `size`: one slot per day
 * across the plot, each day at its slot's centre.
 */
export function fitnessChartGeometry(
  days: FitnessDay[],
  range: FitnessRange,
  size: { width: number; height: number },
  labels: FitnessLabels,
): FitnessChartGeometry {
  const plotWidth = Math.max(0, size.width - Y_GUTTER);
  const slotWidth = plotWidth / days.length;
  const panels = Math.max(0, size.height - TOP_LABEL_ROOM - PANEL_GAP - X_AXIS);
  const topHeight = panels * TOP_SHARE;
  const topBottom = TOP_LABEL_ROOM + topHeight;
  const highest = Math.max(
    0,
    ...values(days, day => day.fitness),
    ...values(days, day => day.fatigue),
  );
  const topMax = Math.max(TOP_STEP, roundUp(TOP_HEADROOM * highest, TOP_STEP));
  const topY = (value: number) => topBottom - (value / topMax) * topHeight;
  const bottomTop = topBottom + PANEL_GAP;
  const bottomHeight = panels - topHeight;
  const forms = values(days, day => day.form);
  const formMax = roundUp(Math.max(FORM_STEP, ...forms), FORM_STEP);
  const formMin = -roundUp(
    Math.max(FORM_STEP, ...forms.map(form => -form)),
    FORM_STEP,
  );
  const formY = (value: number) =>
    bottomTop + ((formMax - value) / (formMax - formMin)) * bottomHeight;

  return {
    plotWidth,
    slotWidth,
    plotHeight: bottomTop + bottomHeight,
    top: {
      fitness: linePath(days, slotWidth, topY, day => day.fitness),
      fatigue: linePath(days, slotWidth, topY, day => day.fatigue),
      // The half is rounded to a whole tick, so its label is exact.
      ticks: [topMax, Math.round(topMax / 2), 0].map(value => ({
        y: topY(value),
        label: `${value}`,
      })),
      bars: barsPath(days, slotWidth, topBottom, topHeight),
    },
    bottom: {
      form: linePath(days, slotWidth, formY, day => day.form),
      ticks: [formMax, 0, formMin].map(value => ({
        y: formY(value),
        label: formatForm(value),
      })),
      zeroY: formY(0),
    },
    dots: todayDots(days, slotWidth, {
      fitness: topY,
      fatigue: topY,
      form: formY,
    }),
    xTicks: days.flatMap((day, index) => {
      const label = xTickLabel(fromLocalDateString(day.date), range, labels);

      return label === null
        ? []
        : [{ x: fitnessSlotCentre(index, slotWidth), label }];
    }),
  };
}

/** The x of day `index`'s slot centre, `slotWidth` wide. */
export function fitnessSlotCentre(index: number, slotWidth: number): number {
  'worklet';

  return slotWidth * (index + 0.5);
}

/**
 * The index of the day under a touch at `x`, on `dayCount` slots `slotWidth`
 * wide, held to the first or last day past either edge. Runs on the UI
 * thread, where the cursor moves.
 */
export function fitnessDayIndexAt(
  x: number,
  slotWidth: number,
  dayCount: number,
): number {
  'worklet';

  return Math.min(dayCount - 1, Math.max(0, Math.floor(x / slotWidth)));
}

/**
 * The time axis's label for `date`, if it gets one: Mondays as day.month
 * ("2.11") on 6 tygodni, month starts by short name on 3 miesiące, and every
 * other month start on rok, always the same months, so the labels hold still
 * as the days move.
 */
function xTickLabel(
  date: Date,
  range: FitnessRange,
  { monthsShort }: FitnessLabels,
): string | null {
  const month = date.getMonth();

  switch (range) {
    case '6w':
      return date.getDay() === 1 ? `${date.getDate()}.${month + 1}` : null;
    case '3m':
      return date.getDate() === 1 ? monthsShort[month] : null;
    case '1y':
      return date.getDate() === 1 && month % 2 === 0
        ? monthsShort[month]
        : null;
  }
}

/** The dot at today's end of each series' line, if it has a value today. */
function todayDots(
  days: FitnessDay[],
  slotWidth: number,
  scales: Record<FitnessChartSeries, (value: number) => number>,
): FitnessChartDot[] {
  const today = days.length - 1;
  const x = round(fitnessSlotCentre(today, slotWidth));

  return (['fitness', 'fatigue', 'form'] as const).flatMap(series => {
    const value = days[today][series];

    return value === null
      ? []
      : [{ series, x, y: round(scales[series](value)) }];
  });
}

/**
 * A bar for each day with load, up from the top panel's bottom (`base`) on a
 * panel `height` high. A rest day's `0` and a day without values draw none.
 */
function barsPath(
  days: FitnessDay[],
  slotWidth: number,
  base: number,
  height: number,
): string {
  const highest = Math.max(0, ...values(days, day => day.load));
  const halfWidth = Math.max(BAR_MIN_WIDTH, slotWidth * BAR_WIDTH) / 2;

  return days
    .map((day, index) => {
      if (!day.load) return '';

      const centre = fitnessSlotCentre(index, slotWidth);
      const top = base - (day.load / highest) * height * BAR_SHARE;
      const left = centre - halfWidth;
      const right = centre + halfWidth;

      return `M${point(left, base)}L${point(left, top)}L${point(right, top)}L${point(right, base)}Z`;
    })
    .join('');
}

/** The values a series has across `days`, skipping days without one. */
function values(
  days: FitnessDay[],
  pick: (day: FitnessDay) => number | null,
): number[] {
  return days.flatMap(day => pick(day) ?? []);
}

/** `value` rounded up to a whole `step`. */
function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/**
 * One series' line through each day at its slot centre. A day without a
 * value draws nothing, and the line starts again (`M`) after it.
 */
function linePath(
  days: FitnessDay[],
  slotWidth: number,
  y: (value: number) => number,
  pick: (day: FitnessDay) => number | null,
): string {
  let path = '';
  let drawing = false;

  days.forEach((day, index) => {
    const value = pick(day);

    if (value === null) {
      drawing = false;

      return;
    }

    path += `${drawing ? 'L' : 'M'}${point(fitnessSlotCentre(index, slotWidth), y(value))}`;
    drawing = true;
  });

  return path;
}

function point(x: number, y: number): string {
  return `${round(x)} ${round(y)}`;
}

/** A tenth of a point is finer than a screen draws. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}
