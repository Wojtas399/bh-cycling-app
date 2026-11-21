import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import type { Note } from '@/lib/notes';
import { Ionicons } from '@expo/vector-icons';

export interface NoteCardProps {
  note: Note;
  when: string;
  showWhenBesideTitle?: boolean;
  subtitle?: string;
  onPress: () => void;
}

export default function NoteCard({
  note,
  when,
  showWhenBesideTitle = true,
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
      <SheenSurface
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
        {showWhenBesideTitle ? (
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
      </SheenSurface>
    </Pressable>
  );
}
