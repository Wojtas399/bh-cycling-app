import { type ReactNode, useEffect, useEffectEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import theme, { useAppTheme } from '@/constants/theme';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import { SheetToastHost } from '@/lib/toast/ToastHost';
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
  /** Called once the sheet has fully left the screen, however it closed. */
  onDismissed?: () => void;
  title?: string;
  /** A muted line under the title. */
  subtitle?: string;
  /**
   * Opens the sheet at the full screen height, for reading long content,
   * instead of sizing it to its content.
   */
  fullHeight?: boolean;
  children: ReactNode;
  testID?: string;
}

/**
 * Native bottom sheet (Expo UI) with a header — optional title and subtitle,
 * and an always-present ✕ — over a body that sizes to its content and scrolls
 * once it reaches 70% of the window height. `fullHeight` opens it at the full
 * screen height instead, its body scrolling within. See ADR 0003.
 */
export default function BottomSheet({
  visible,
  onClose,
  onDismissed,
  title,
  subtitle,
  fullHeight = false,
  children,
  testID,
}: BottomSheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'common' });
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const body = (
    <Box
      paddingHorizontal="lg"
      style={{
        width,
        // Full height fixes the body so its ScrollView can flex into it;
        // the default caps a content-sized body.
        ...(fullHeight
          ? { height: height - insets.top }
          : { maxHeight: height * MAX_HEIGHT_RATIO }),
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
        {title ? (
          <Box flex={1} marginRight="sm">
            <Text variant="h3">{title}</Text>
            {subtitle ? (
              <Text
                variant="body-s-regular"
                color="textSecondary"
                marginTop="xs"
              >
                {subtitle}
              </Text>
            ) : null}
          </Box>
        ) : null}
        <TouchableOpacity
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('close')}
        >
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Box>

      <ScrollView
        nestedScrollEnabled
        style={fullHeight ? { flex: 1 } : undefined}
        contentContainerStyle={
          fullHeight
            ? { paddingBottom: insets.bottom + theme.spacing.lg }
            : undefined
        }
      >
        {children}
      </ScrollView>

      {/* On Android the sheet is a Dialog window above the root toast
          host, so it carries its own host while presented. iOS keeps
          the root host above sheets (ADR 0004). */}
      {Platform.OS === 'android' && visible ? <SheetToastHost /> : null}

      {onDismissed ? <DismissedSignal onDismissed={onDismissed} /> : null}
    </Box>
  );

  return (
    <ExpoBottomSheet
      isPresented={visible}
      onDismiss={onClose}
      snapPoints={fullHeight ? ['full'] : undefined}
      showDragIndicator
      // Our own content view carries the theme padding and the full width.
      contentPadding={0}
      // On iOS 26 the sheet shows the system's Liquid Glass material, kept
      // dark by the app-wide forced dark scheme. Elsewhere we paint it dark.
      containerColor={
        liquidGlassAvailable ? undefined : theme.colors.bgTertiary
      }
      scrimColor={theme.colors.overlay}
      modifiers={
        Platform.OS === 'ios' && !liquidGlassAvailable
          ? [preferredColorScheme('dark')]
          : undefined
      }
    >
      {fullHeight ? (
        <RNHostView>{body}</RNHostView>
      ) : (
        <RNHostView matchContents>{body}</RNHostView>
      )}
    </ExpoBottomSheet>
  );
}

/**
 * Expo UI's universal sheet has no "finished dismissing" event, but on both
 * platforms it unmounts the content only after the dismissal has finished.
 */
function DismissedSignal({ onDismissed }: { onDismissed: () => void }) {
  const notify = useEffectEvent(onDismissed);

  useEffect(() => () => notify(), []);

  return null;
}
