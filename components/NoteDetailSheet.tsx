import { Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import NoteMarkdown from '@/components/NoteMarkdown';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface NoteDetailSheetProps {
  title: string;
  dayLabel: string;
  /** Raw Markdown, rendered by NoteMarkdown. */
  text: string;
  onClose: () => void;
}

/**
 * Bottom sheet showing a note's full content. Mounted only while open — the
 * caller conditionally renders this component rather than toggling a
 * `visible` prop, since RN's Modal keeps its children in the tree even when
 * hidden.
 */
export default function NoteDetailSheet({
  title,
  dayLabel,
  text,
  onClose,
}: NoteDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        {/* Swallows taps so they don't fall through to the backdrop and close the sheet. */}
        <Pressable onPress={() => {}} testID="note-detail-sheet">
          <Box
            backgroundColor="bgSecondary"
            paddingHorizontal="base"
            paddingTop="sm"
            style={{
              borderTopLeftRadius: theme.borderRadii.xl,
              borderTopRightRadius: theme.borderRadii.xl,
              minHeight: '40%',
              maxHeight: '80%',
              paddingBottom: insets.bottom + theme.spacing.base,
            }}
          >
            <Box alignItems="center" marginBottom="base">
              <Box
                width={36}
                height={4}
                borderRadius="full"
                backgroundColor="borderStrong"
              />
            </Box>

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

            <ScrollView showsVerticalScrollIndicator={false}>
              <Box marginTop="md">
                <NoteMarkdown text={text} />
              </Box>
            </ScrollView>
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
