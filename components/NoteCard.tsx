import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import type { Note } from '@/lib/notes';
import { Ionicons } from '@expo/vector-icons';

export interface NoteCardProps {
  note: Note;
  /** When the Note applies, e.g. "Dziś", as the card shows and announces it. */
  when: string;
  /**
   * Whether `when` shows beside the title. Off where the day is already on
   * screen (the day sheet), which still announces it.
   */
  showWhen?: boolean;
  /** A muted line under the title, e.g. a multi-day Note's range. */
  subtitle?: string;
  onPress: () => void;
}

/**
 * A title-only card for one Note, in `WorkoutTile`'s card language: the title
 * (or "Notatka"), an optional subtitle, when it applies and a chevron.
 * Tapping it opens the Note.
 */
export default function NoteCard({
  note,
  when,
  showWhen = true,
  subtitle,
  onPress,
}: NoteCardProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const theme = useAppTheme();
  const noteTitle = useNoteTitle();
  const title = noteTitle(note);

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
        <Box flex={1}>
          <Text variant="body-l-semibold" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body-s-regular" color="textSecondary" marginTop="xs">
              {subtitle}
            </Text>
          ) : null}
        </Box>
        {showWhen ? (
          <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
            {when}
          </Text>
        ) : null}
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
