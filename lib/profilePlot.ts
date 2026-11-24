import { formatDuration } from './formatDuration';
import type {
  ActivityProfileSummary,
  ProfileCard,
  StripPower,
  StripSegment,
} from './profileCard';
import type { WorkoutProfileSummary } from './workoutDetails';
import type { TFunction } from 'i18next';

export interface PlotStrip {
  segments: StripSegment[];
  caption: string;
}

export interface ProfilePlot {
  strips: PlotStrip[];
  accessibilityLabel: string;
}

export function profilePlot(
  { planned, recorded }: Pick<ProfileCard, 'planned' | 'recorded'>,
  t: TFunction,
): ProfilePlot {
  function powerLabel({ unit, peak, average }: StripPower) {
    return t(`workoutDetails.profilePower.${unit}`, { peak, average });
  }

  function plannedLabel(summary: WorkoutProfileSummary, power: StripPower) {
    return t('workoutDetails.profileLabel', {
      duration: formatDuration(summary.durationSeconds),
      steps: t('workoutDetails.steps', { count: summary.stepCount }),
      peak: power.peakFtpPct,
      power: powerLabel(power),
    });
  }

  function recordedLabel(summary: ActivityProfileSummary, power: StripPower) {
    return t('activityDetails.profileLabel', {
      duration: formatDuration(summary.durationSeconds),
      segments: t('activityDetails.segments', { count: summary.segmentCount }),
      peak: power.peakFtpPct,
      power: powerLabel(power),
    });
  }

  const plannedText = planned && plannedLabel(planned.summary, planned.power);
  const recordedText =
    recorded && recordedLabel(recorded.summary, recorded.power);

  return {
    strips: [
      ...(planned
        ? [
            {
              segments: planned.segments,
              caption: t('workoutDetails.strip.planned'),
            },
          ]
        : []),
      ...(recorded
        ? [
            {
              segments: recorded.segments,
              caption: t('workoutDetails.strip.recorded'),
            },
          ]
        : []),
    ],
    accessibilityLabel:
      plannedText && recordedText
        ? t('workoutDetails.comparedProfilesLabel', {
            planned: plannedText,
            recorded: recordedText,
          })
        : (plannedText ?? recordedText ?? ''),
  };
}

const MIN_BAR_WIDTH_PX = 2;

const HAIRLINE_KEEPING_REPEATS_COUNTABLE_PX = 1;

const WIDTH_SPARING_HAIRLINES_PX = 4 * HAIRLINE_KEEPING_REPEATS_COUNTABLE_PX;

export interface SegmentPixels {
  x: number;
  width: number;
}

export function segmentPixels(
  {
    startSeconds,
    endSeconds,
  }: Pick<StripSegment, 'startSeconds' | 'endSeconds'>,
  durationSeconds: number,
  plotWidth: number,
): SegmentPixels {
  const xOf = (seconds: number) => (seconds / durationSeconds) * plotWidth;
  const x = xOf(startSeconds);
  const width = xOf(endSeconds) - x;

  if (width > WIDTH_SPARING_HAIRLINES_PX) {
    return {
      x: x + HAIRLINE_KEEPING_REPEATS_COUNTABLE_PX,
      width: width - 2 * HAIRLINE_KEEPING_REPEATS_COUNTABLE_PX,
    };
  }

  if (width >= MIN_BAR_WIDTH_PX) return { x, width };

  return { x: x + (width - MIN_BAR_WIDTH_PX) / 2, width: MIN_BAR_WIDTH_PX };
}
