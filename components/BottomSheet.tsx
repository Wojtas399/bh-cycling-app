import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import theme, { useAppTheme } from '@/constants/theme';
import { BottomSheet as ExpoBottomSheet, RNHostView } from '@expo/ui';
import { preferredColorScheme } from '@expo/ui/swift-ui/modifiers';
import { Ionicons } from '@expo/vector-icons';

/** Share of the window height the sheet may take before its body scrolls. */
const MAX_HEIGHT_RATIO = 0.7;

/**
 * Gap above the header on iOS, where the drag indicator overlays the content.
 * Android's drag handle reserves its own padded slot, so it needs none.
 */
const IOS_HEADER_TOP_PADDING = theme.spacing.lg + theme.spacing.sm;

export interface BottomSheetProps {
  /** Whether the sheet is open. */
  visible: boolean;
  /** Called on every user dismissal: swipe, backdrop tap, back, or ✕. */
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testID?: string;
}

/**
 * Native bottom sheet (Expo UI) with a header — optional title and an
 * always-present ✕ — over a body that sizes to its content and scrolls once
 * it reaches 70% of the window height. See ADR 0003.
 */
export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'common' });
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();

  return (
    <ExpoBottomSheet
      isPresented={visible}
      onDismiss={onClose}
      showDragIndicator
      // Our own content view carries the theme padding and the full width.
      contentPadding={0}
      containerColor={theme.colors.bgTertiary}
      scrimColor={theme.colors.overlay}
      modifiers={
        Platform.OS === 'ios' ? [preferredColorScheme('dark')] : undefined
      }
    >
      <RNHostView matchContents>
        <Box
          paddingHorizontal="lg"
          style={{
            width,
            maxHeight: height * MAX_HEIGHT_RATIO,
            paddingTop: Platform.OS === 'ios' ? IOS_HEADER_TOP_PADDING : 0,
          }}
          testID={testID}
        >
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent={title ? 'space-between' : 'flex-end'}
            marginBottom="base"
          >
            {title ? <Text variant="h3">{title}</Text> : null}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </Box>

          <ScrollView nestedScrollEnabled>{children}</ScrollView>
        </Box>
      </RNHostView>
    </ExpoBottomSheet>
  );
}
