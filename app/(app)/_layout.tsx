import { Stack } from 'expo-router';

const ROUTE_MAP_OPTIONS = {
  presentation: 'fullScreenModal',
  animation: 'slide_from_bottom',
} as const;

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* First, so the auth gate lands a verified user on the tabs. */}
      <Stack.Screen name="(tabs)" />
      {/* Slide up over Workout Details and Activity Details. On Android,
          where a full-screen modal is an ordinary push, the animation gives
          the same slide up. */}
      <Stack.Screen name="workout/[id]/map" options={ROUTE_MAP_OPTIONS} />
      <Stack.Screen name="activity/[id]/map" options={ROUTE_MAP_OPTIONS} />
    </Stack>
  );
}
