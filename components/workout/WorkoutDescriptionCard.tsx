import { useTranslation } from 'react-i18next';

import NoteMarkdown from '@/components/NoteMarkdown';
import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

export interface WorkoutDescriptionCardProps {
  description: string;
  asNoteMarkdown?: boolean;
}

export default function WorkoutDescriptionCard({
  description,
  asNoteMarkdown = false,
}: WorkoutDescriptionCardProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <WorkoutDetailsCard title={t('description')}>
      {asNoteMarkdown ? (
        <NoteMarkdown text={description} />
      ) : (
        <Text variant="body-s-regular">{description}</Text>
      )}
    </WorkoutDetailsCard>
  );
}
