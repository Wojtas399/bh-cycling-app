import { useTranslation } from 'react-i18next';

import NoteMarkdown from '@/components/NoteMarkdown';
import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

export interface WorkoutDescriptionCardProps {
  /** The notes; with `markdown`, Note Markdown with HTML already stripped. */
  description: string;
  /** Renders the notes as Note Markdown rather than plain text. */
  markdown?: boolean;
}

/** The Opis card: free-text notes, in both modes. */
export default function WorkoutDescriptionCard({
  description,
  markdown = false,
}: WorkoutDescriptionCardProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <WorkoutDetailsCard title={t('description')}>
      {markdown ? (
        <NoteMarkdown text={description} />
      ) : (
        <Text variant="body-s-regular">{description}</Text>
      )}
    </WorkoutDetailsCard>
  );
}
