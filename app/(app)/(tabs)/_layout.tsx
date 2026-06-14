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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F2F2F7',
        tabBarInactiveTintColor: '#AEAEB2',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#2C2C2E',
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: tabIcon('calendar', 'calendar-outline'),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: tabIcon('settings', 'settings-outline'),
        }}
      />
    </Tabs>
  );
}
