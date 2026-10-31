import { useTranslation } from 'react-i18next';

import ProfileWithTimeAxis from '@/components/workout/ProfileWithTimeAxis';
import type { ActivityProfileSummary } from '@/lib/activityDetails';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutBlock } from '@/lib/workoutProfile';

export interface ActivityDetailsProfileProps {
  blocks: WorkoutBlock[];
  summary: ActivityProfileSummary;
}

/**
 * The Activity Profile over its elapsed time, stops included, read by a
 * screen reader as one summary.
 */
export default function ActivityDetailsProfile({
  blocks,
  summary,
}: ActivityDetailsProfileProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });

  return (
    <ProfileWithTimeAxis
      strips={[blocks]}
      durationSeconds={summary.durationSeconds}
      accessibilityLabel={t('profileLabel', {
        duration: formatDuration(summary.durationSeconds),
        segments: t('segments', { count: summary.segmentCount }),
        peak: summary.peakFtpPct,
      })}
      testID="activity-details-profile"
    />
  );
}
