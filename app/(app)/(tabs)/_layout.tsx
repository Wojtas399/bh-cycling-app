import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import Box from '@/components/Box';
import IntervalsReconnectBanner from '@/components/IntervalsReconnectBanner';
import { useAppTheme } from '@/constants/theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

/**
 * Native tabs. On iOS 26 the bar is the system's Liquid Glass, and the
 * selected tab is bold white with no accent colour; the glass bar ignores the
 * unselected colour, so those stay system white. On Android it is a dark
 * Material bar with a white selected tab and grey unselected ones.
 */
export default function TabsLayout() {
  const { t } = useTranslation(undefined, { keyPrefix: 'tabs' });
  const { colors } = useAppTheme();

  return (
    <Box flex={1}>
      <IntervalsReconnectBanner />
      <NativeTabs
        tintColor={colors.white}
        iconColor={{ default: colors.textSecondary, selected: colors.white }}
        labelStyle={{
          default: { color: colors.textSecondary },
          selected: { color: colors.white, fontWeight: '700' },
        }}
        // Painting the iOS bar would cover its glass.
        backgroundColor={
          Platform.OS === 'android' ? colors.bgTertiary : undefined
        }
        indicatorColor={colors.borderStrong}
      >
        <NativeTabs.Trigger name="home/index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md="home"
          />
          <NativeTabs.Trigger.Label>{t('home')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="calendar/index">
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
          <NativeTabs.Trigger.Label>{t('calendar')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings/index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
            md="settings"
          />
          <NativeTabs.Trigger.Label>{t('settings')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </Box>
  );
}
