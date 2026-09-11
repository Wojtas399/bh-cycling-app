import { Pressable } from 'react-native';

import Box from '@/components/Box';
import NoteMarkdown from '@/components/NoteMarkdown';
import Sheet, { BottomSheetScrollView } from '@/components/Sheet';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface NoteDetailSheetProps {
  open: boolean;
  title: string;
  dayLabel: string;
  /** Raw Markdown, rendered by NoteMarkdown. */
  text: string;
  onClose: () => void;
}

/**
 * Bottom sheet showing a note's full content, built on the shared `Sheet`
 * shell. `open` is passed straight through — `Sheet` gates children
 * internally, so the caller no longer needs to conditionally mount this
 * component.
 */
export default function NoteDetailSheet({
  open,
  title,
  dayLabel,
  text,
  onClose,
}: NoteDetailSheetProps) {
  const theme = useAppTheme();

  return (
    <Sheet open={open} onClose={onClose}>
      <Box paddingHorizontal="base">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Text variant="h3" style={{ flex: 1 }}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons
              name="close"
              size={22}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </Box>
        <Text variant="body-s-regular" color="textSecondary" marginTop="xs">
          {dayLabel}
        </Text>
      </Box>

      <BottomSheetScrollView showsVerticalScrollIndicator={false}>
        <Box paddingHorizontal="base" marginTop="md">
          <NoteMarkdown text={text} />
        </Box>
      </BottomSheetScrollView>
    </Sheet>
  );
}
