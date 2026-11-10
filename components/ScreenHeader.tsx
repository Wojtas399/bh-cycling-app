import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Pressable } from 'react-native';

import Box from '@/components/Box';
import GlassHeader from '@/components/GlassHeader';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  title: string;
  backDisabled?: boolean;
  /** From `useGlassHeader('pushed')`, which lays the screen out under it. */
  onLayout: (event: LayoutChangeEvent) => void;
  /** Chrome under the title row, such as a banner, that stays put too. */
  children?: ReactNode;
}

const SIDE_SLOT_WIDTH = 44;

/**
 * A pushed screen's back arrow and title in a sticky Glass header. Render it
 * after the screen's content, which scrolls under it.
 */
export default function ScreenHeader({
  title,
  backDisabled,
  onLayout,
  children,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <GlassHeader onLayout={onLayout}>
      <Box
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="sm"
        paddingTop="sm"
        paddingBottom="sm"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          accessibilityState={{ disabled: backDisabled }}
          disabled={backDisabled}
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: SIDE_SLOT_WIDTH,
            height: SIDE_SLOT_WIDTH,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: backDisabled ? 0.4 : 1,
          }}
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color={theme.colors.textPrimary}
          />
        </Pressable>

        <Box flex={1} alignItems="center">
          <Text variant="h3" numberOfLines={1}>
            {title}
          </Text>
        </Box>

        <Box style={{ width: SIDE_SLOT_WIDTH }} />
      </Box>
      {children}
    </GlassHeader>
  );
}
