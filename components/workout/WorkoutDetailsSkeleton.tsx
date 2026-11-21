import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import SkeletonBar from '@/components/SkeletonBar';
import ProfileCardSkeleton from '@/components/workout/ProfileCardSkeleton';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

export default function WorkoutDetailsSkeleton({
  loadingLabel,
}: {
  loadingLabel?: string;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <Box
      gap="md"
      accessible
      accessibilityLabel={loadingLabel ?? t('loading')}
      accessibilityState={{ busy: true }}
      testID="workout-details-skeleton"
    >
      <Box gap="sm" paddingHorizontal="md">
        <SkeletonBar width={96} height={24} onPage />
        <SkeletonBar width="70%" height={28} onPage />
        <SkeletonBar width={160} height={14} onPage />
      </Box>

      <ProfileCardSkeleton />

      <WorkoutDetailsCard>
        <Box gap="sm">
          <SkeletonBar width="40%" height={14} />
          <SkeletonBar width="60%" height={14} />
          <SkeletonBar width="50%" height={14} />
        </Box>
      </WorkoutDetailsCard>
    </Box>
  );
}
