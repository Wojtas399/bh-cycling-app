import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import type { Note } from '@/lib/notes';
import { Ionicons } from '@expo/vector-icons';

export interface NoteCardProps {
  note: Note;
  /** When the Note applies, e.g. "Dziś". */
  when: string;
  onPress: () => void;
}

/**
 * A title-only card for one Note, in `WorkoutTile`'s card language: the title
 * (or "Notatka"), when it applies and a chevron. Tapping it opens the Note.
 */
export default function NoteCard({ note, when, onPress }: NoteCardProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const theme = useAppTheme();
  const title = note.name ?? t('untitled');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('accessibilityLabel', { title, when })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Box
        backgroundColor="bgSecondary"
        borderRadius="lg"
        padding="base"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
        <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
          {when}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textTertiary}
          style={{ marginLeft: theme.spacing.xs }}
        />
      </Box>
    </Pressable>
  );
}
