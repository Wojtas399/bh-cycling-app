import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import type { WorkoutStatus } from '@/lib/workoutStatus';

export interface WorkoutStatusPillProps {
  status: WorkoutStatus;
}

export default function WorkoutStatusPill({ status }: WorkoutStatusPillProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.status',
  });

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      alignSelf="flex-start"
      paddingHorizontal="sm"
      paddingVertical="xs"
      borderRadius="full"
      backgroundColor={status === 'missed' ? 'dangerDim' : 'bgTertiary'}
      gap="xs"
    >
      <WorkoutStatusDot status={status} size={8} />
      <Text variant="body-xs-medium">{t(status)}</Text>
    </Box>
  );
}
