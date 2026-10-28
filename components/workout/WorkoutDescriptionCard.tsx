import { useTranslation } from 'react-i18next';

import NoteMarkdown from '@/components/NoteMarkdown';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

export interface WorkoutDescriptionCardProps {
  /** The Workout's notes, as Note Markdown with any HTML already stripped. */
  description: string;
}

/** The Opis card: the Workout's notes rendered as Markdown, in both modes. */
export default function WorkoutDescriptionCard({
  description,
}: WorkoutDescriptionCardProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <WorkoutDetailsCard title={t('description')}>
      <NoteMarkdown text={description} />
    </WorkoutDetailsCard>
  );
}
