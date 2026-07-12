import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import IntervalsReconnectBanner from '@/components/IntervalsReconnectBanner';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IoniconName, inactive: IoniconName) {
  function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
      <Ionicons name={focused ? active : inactive} size={24} color={color} />
    );
  }

  return TabIcon;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <Box flex={1}>
      <IntervalsReconnectBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.bgTertiary,
            borderTopColor: colors.borderDefault,
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen
          name="home/index"
          options={{
            tabBarLabel: t('tabs.home'),
            tabBarIcon: tabIcon('home', 'home-outline'),
          }}
        />
        <Tabs.Screen
          name="calendar/index"
          options={{
            tabBarLabel: t('tabs.calendar'),
            tabBarIcon: tabIcon('calendar', 'calendar-outline'),
          }}
        />
        <Tabs.Screen
          name="settings/index"
          options={{
            tabBarLabel: t('tabs.settings'),
            tabBarIcon: tabIcon('settings', 'settings-outline'),
          }}
        />
      </Tabs>
    </Box>
  );
}
