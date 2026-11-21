import { Stack } from 'expo-router';

const ROUTE_MAP_SLIDES_UP_ON_BOTH_PLATFORMS = {
  presentation: 'fullScreenModal',
  animation: 'slide_from_bottom',
} as const;

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="workout/[id]/map"
        options={ROUTE_MAP_SLIDES_UP_ON_BOTH_PLATFORMS}
      />
      <Stack.Screen
        name="activity/[id]/map"
        options={ROUTE_MAP_SLIDES_UP_ON_BOTH_PLATFORMS}
      />
    </Stack>
  );
}
