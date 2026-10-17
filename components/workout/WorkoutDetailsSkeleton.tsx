import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

function Bar({
  width,
  height = 14,
}: {
  width: number | `${number}%`;
  height?: number;
}) {
  return (
    <Box
      backgroundColor="bgTertiary"
      borderRadius="sm"
      style={{ width, height }}
    />
  );
}

/** Placeholder of the Workout Details layout while the Workout loads. */
export default function WorkoutDetailsSkeleton() {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <Box
      gap="md"
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
      testID="workout-details-skeleton"
    >
      <Box gap="sm" paddingHorizontal="md">
        <Bar width={96} height={24} />
        <Bar width="70%" height={28} />
        <Bar width={160} />
      </Box>

      <WorkoutDetailsCard>
        <Bar width="100%" height={120} />
      </WorkoutDetailsCard>

      <WorkoutDetailsCard>
        <Box gap="sm">
          <Bar width="40%" />
          <Bar width="60%" />
          <Bar width="50%" />
        </Box>
      </WorkoutDetailsCard>
    </Box>
  );
}
