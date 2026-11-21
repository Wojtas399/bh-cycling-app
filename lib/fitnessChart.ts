import {
  type FitnessDay,
  type FitnessLabels,
  type FitnessRange,
  formatForm,
} from './fitness';
import { fromLocalDateString } from './localDate';

const Y_LABEL_GUTTER_RIGHT_OF_PLOT_PT = 28;
const ROOM_FOR_TOP_LABEL_PT = 6;
const X_LABEL_STRIP_PT = 20;
const PANEL_GAP_PT = 16;
const TOP_PANEL_SHARE_OF_PANELS = 0.64;
const TOP_SCALE_STEP_AND_LEAST_MAX = 25;
const HEADROOM_OVER_HIGHEST_TOP_VALUE = 1.08;
const LOAD_BARS_SHARE_OF_TOP_PANEL = 0.55;
const LOAD_BAR_SHARE_OF_SLOT = 0.6;
const LOAD_BAR_MIN_WIDTH_PT = 1;
const FORM_SCALE_STEP_AND_LEAST_REACH = 10;
const MONDAY = 1;

export interface FitnessChartGeometry {
  plotWidth: number;
  slotWidth: number;
  plotHeight: number;
  top: {
    fitness: string;
    fatigue: string;
    ticks: FitnessChartTick[];
    bars: string;
  };
  bottom: {
    form: string;
    ticks: FitnessChartTick[];
    zeroY: number;
  };
  dots: FitnessChartDot[];
  xTicks: { x: number; label: string }[];
}

export type FitnessChartSeries = 'fitness' | 'fatigue' | 'form';

export interface FitnessChartDot {
  series: FitnessChartSeries;
  x: number;
  y: number;
}

export interface FitnessChartTick {
  y: number;
  label: string;
}

export function fitnessChartGeometry(
  days: FitnessDay[],
  range: FitnessRange,
  size: { width: number; height: number },
  labels: FitnessLabels,
): FitnessChartGeometry {
  const plotWidth = Math.max(0, size.width - Y_LABEL_GUTTER_RIGHT_OF_PLOT_PT);
  const slotWidth = plotWidth / days.length;
  const panels = Math.max(
    0,
    size.height - ROOM_FOR_TOP_LABEL_PT - PANEL_GAP_PT - X_LABEL_STRIP_PT,
  );
  const topHeight = panels * TOP_PANEL_SHARE_OF_PANELS;
  const topBottom = ROOM_FOR_TOP_LABEL_PT + topHeight;
  const highest = Math.max(
    0,
    ...valuesSkippingDaysWithout(days, day => day.fitness),
    ...valuesSkippingDaysWithout(days, day => day.fatigue),
  );
  const topMax = Math.max(
    TOP_SCALE_STEP_AND_LEAST_MAX,
    roundUpToStep(
      HEADROOM_OVER_HIGHEST_TOP_VALUE * highest,
      TOP_SCALE_STEP_AND_LEAST_MAX,
    ),
  );
  const topY = (value: number) => topBottom - (value / topMax) * topHeight;
  const bottomTop = topBottom + PANEL_GAP_PT;
  const bottomHeight = panels - topHeight;
  const forms = valuesSkippingDaysWithout(days, day => day.form);
  const formMax = roundUpToStep(
    Math.max(FORM_SCALE_STEP_AND_LEAST_REACH, ...forms),
    FORM_SCALE_STEP_AND_LEAST_REACH,
  );
  const formMin = -roundUpToStep(
    Math.max(FORM_SCALE_STEP_AND_LEAST_REACH, ...forms.map(form => -form)),
    FORM_SCALE_STEP_AND_LEAST_REACH,
  );
  const topHalfTickRoundedToWhole = Math.round(topMax / 2);
  const formY = (value: number) =>
    bottomTop + ((formMax - value) / (formMax - formMin)) * bottomHeight;

  return {
    plotWidth,
    slotWidth,
    plotHeight: bottomTop + bottomHeight,
    top: {
      fitness: lineBrokenAtDaysWithout(
        days,
        slotWidth,
        topY,
        day => day.fitness,
      ),
      fatigue: lineBrokenAtDaysWithout(
        days,
        slotWidth,
        topY,
        day => day.fatigue,
      ),
      ticks: [topMax, topHalfTickRoundedToWhole, 0].map(value => ({
        y: topY(value),
        label: `${value}`,
      })),
      bars: loadBarsOnTheirOwnScale(days, slotWidth, topBottom, topHeight),
    },
    bottom: {
      form: lineBrokenAtDaysWithout(days, slotWidth, formY, day => day.form),
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

export function fitnessSlotCentre(index: number, slotWidth: number): number {
  'worklet';

  return slotWidth * (index + 0.5);
}

export function fitnessDayIndexAt(
  x: number,
  slotWidth: number,
  dayCount: number,
): number {
  'worklet';

  return Math.min(dayCount - 1, Math.max(0, Math.floor(x / slotWidth)));
}

function xTickLabel(
  date: Date,
  range: FitnessRange,
  { monthsShort }: FitnessLabels,
): string | null {
  const month = date.getMonth();

  switch (range) {
    case '6w':
      return date.getDay() === MONDAY ? `${date.getDate()}.${month + 1}` : null;
    case '3m':
      return date.getDate() === 1 ? monthsShort[month] : null;
    case '1y':
      return date.getDate() === 1 && isEveryOtherMonthFromJanuary(month)
        ? monthsShort[month]
        : null;
  }
}

function isEveryOtherMonthFromJanuary(monthIndex: number): boolean {
  return monthIndex % 2 === 0;
}

function todayDots(
  days: FitnessDay[],
  slotWidth: number,
  scales: Record<FitnessChartSeries, (value: number) => number>,
): FitnessChartDot[] {
  const today = days.length - 1;
  const x = roundToTenthOfPoint(fitnessSlotCentre(today, slotWidth));

  return (['fitness', 'fatigue', 'form'] as const).flatMap(series => {
    const value = days[today][series];

    return value === null
      ? []
      : [{ series, x, y: roundToTenthOfPoint(scales[series](value)) }];
  });
}

function loadBarsOnTheirOwnScale(
  days: FitnessDay[],
  slotWidth: number,
  base: number,
  panelHeight: number,
): string {
  const highest = Math.max(
    0,
    ...valuesSkippingDaysWithout(days, day => day.load),
  );
  const halfWidth =
    Math.max(LOAD_BAR_MIN_WIDTH_PT, slotWidth * LOAD_BAR_SHARE_OF_SLOT) / 2;

  return days
    .map((day, index) => {
      if (!day.load) return '';

      const centre = fitnessSlotCentre(index, slotWidth);
      const top =
        base -
        (day.load / highest) * panelHeight * LOAD_BARS_SHARE_OF_TOP_PANEL;
      const left = centre - halfWidth;
      const right = centre + halfWidth;

      return `M${point(left, base)}L${point(left, top)}L${point(right, top)}L${point(right, base)}Z`;
    })
    .join('');
}

function valuesSkippingDaysWithout(
  days: FitnessDay[],
  pick: (day: FitnessDay) => number | null,
): number[] {
  return days.flatMap(day => pick(day) ?? []);
}

function roundUpToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function lineBrokenAtDaysWithout(
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
  return `${roundToTenthOfPoint(x)} ${roundToTenthOfPoint(y)}`;
}

function roundToTenthOfPoint(value: number): number {
  return Math.round(value * 10) / 10;
}
