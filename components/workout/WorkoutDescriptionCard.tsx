import { useTranslation } from 'react-i18next';

import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

export interface WorkoutDescriptionCardProps {
  /** The Workout's free-text notes. */
  description: string;
}

/** The Opis card: the Workout's free-text notes, in both modes. */
export default function WorkoutDescriptionCard({
  description,
}: WorkoutDescriptionCardProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <WorkoutDetailsCard title={t('description')}>
      <Text variant="body-s-regular">{description}</Text>
    </WorkoutDetailsCard>
  );
}
