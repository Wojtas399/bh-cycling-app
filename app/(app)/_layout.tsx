import { useEffect } from 'react';

import { auth } from '@/lib/firebase';
import { Stack, useRouter } from 'expo-router';

const ROUTE_MAP_OPTIONS = {
  presentation: 'fullScreenModal',
  animation: 'slide_from_bottom',
} as const;

export default function AppLayout() {
  const router = useRouter();

  useEffect(() => {
    return auth().onAuthStateChanged(user => {
      if (!user) {
        router.replace('/(auth)/sign-in');
      } else if (!user.emailVerified) {
        router.replace('/(auth)/verify-email');
      }
    });
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Slide up over Workout Details and Activity Details. On Android,
          where a full-screen modal is an ordinary push, the animation gives
          the same slide up. */}
      <Stack.Screen name="workout/[id]/map" options={ROUTE_MAP_OPTIONS} />
      <Stack.Screen name="activity/[id]/map" options={ROUTE_MAP_OPTIONS} />
    </Stack>
  );
}
