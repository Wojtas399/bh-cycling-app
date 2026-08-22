import { useState } from 'react';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import NoteDetailSheet from '@/components/NoteDetailSheet';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface NoteCardProps {
  title: string;
  dayLabel: string;
  /** Raw Markdown, shown in full inside the detail sheet, unrendered. */
  text: string;
}

/**
 * Presentational card for a single day note. Mirrors WorkoutTile's card
 * language but shows only the title and day label — tapping it opens
 * NoteDetailSheet with the full text, since a note carries no Workout
 * Profile to summarize it by.
 */
export default function NoteCard({ title, dayLabel, text }: NoteCardProps) {
  const [open, setOpen] = useState(false);
  const theme = useAppTheme();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={title}
        testID="note-card"
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
            {dayLabel}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textTertiary}
            style={{ marginLeft: theme.spacing.xs }}
          />
        </Box>
      </Pressable>

      {open && (
        <NoteDetailSheet
          title={title}
          dayLabel={dayLabel}
          text={text}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
