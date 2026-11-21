import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import theme, { useAppTheme } from '@/constants/theme';
import {
  SHEET_HOSTS_ITS_OWN_TOASTS,
  sheetSurface,
  signalOnDetach,
} from '@/lib/bottomSheet';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import { SheetToastHost } from '@/lib/toast/ToastHost';
import { BottomSheet as ExpoBottomSheet, RNHostView } from '@expo/ui';
import { preferredColorScheme } from '@expo/ui/swift-ui/modifiers';
import { Ionicons } from '@expo/vector-icons';

const WINDOW_HEIGHT_SHARE_BEFORE_SCROLL = 0.7;

const IOS_DRAG_INDICATOR_CLEARANCE = theme.spacing.lg + theme.spacing.sm;

const NATIVE_PADDING_REPLACED_BY_CONTENT_VIEW = 0;

const surface = sheetSurface(Platform.OS, liquidGlassAvailable);

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  title?: string;
  children: ReactNode;
  testID?: string;
}

export default function BottomSheet({
  visible,
  onClose,
  onDismissed,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'common' });
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const signalDismissedOnDetach = useMemo(
    () => signalOnDetach(onDismissed),
    [onDismissed],
  );

  return (
    <ExpoBottomSheet
      isPresented={visible}
      onDismiss={onClose}
      showDragIndicator
      contentPadding={NATIVE_PADDING_REPLACED_BY_CONTENT_VIEW}
      containerColor={
        surface.paintsBackground ? theme.colors.bgTertiary : undefined
      }
      scrimColor={theme.colors.overlay}
      modifiers={
        surface.forcesDarkScheme ? [preferredColorScheme('dark')] : undefined
      }
    >
      <RNHostView matchContents>
        <Box
          paddingHorizontal="lg"
          style={{
            width,
            maxHeight: height * WINDOW_HEIGHT_SHARE_BEFORE_SCROLL,
            paddingTop:
              Platform.OS === 'ios' ? IOS_DRAG_INDICATOR_CLEARANCE : 0,
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
              </Box>
            ) : null}
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

          {SHEET_HOSTS_ITS_OWN_TOASTS && visible ? <SheetToastHost /> : null}

          <View ref={signalDismissedOnDetach} />
        </Box>
      </RNHostView>
    </ExpoBottomSheet>
  );
}
