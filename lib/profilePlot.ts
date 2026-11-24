import { formatDuration } from './formatDuration';
import type {
  ActivityProfileSummary,
  ProfileCard,
  StripPower,
  StripSegment,
  WorkoutProfileSummary,
} from './profileCard';
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
