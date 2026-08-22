import Box from '@/components/Box';
import Text from '@/components/Text';

export interface NoteCardProps {
  title: string;
  dayLabel: string;
  /** Raw Markdown, rendered as plain wrapped text for v1. */
  text: string;
}

/**
 * Presentational card for a single day note. Mirrors WorkoutTile's card
 * language (title + day label row, content below) since a note carries no
 * Workout Profile to draw. Non-interactive; always shows the full text.
 */
export default function NoteCard({ title, dayLabel, text }: NoteCardProps) {
  return (
    <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
        <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
          {dayLabel}
        </Text>
      </Box>
      <Text variant="body-s-regular" color="textSecondary" marginTop="sm">
        {text}
      </Text>
    </Box>
  );
}
