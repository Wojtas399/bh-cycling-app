import { useEffect } from 'react';

import { auth } from '@/lib/firebase';
import { Stack, useRouter } from 'expo-router';

export default function AppLayout() {
  const router = useRouter();

  useEffect(() => {
    return auth().onAuthStateChanged(user => {
      if (!user) {
        router.replace('/(auth)/sign-in');
      }
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
