import { useEffect } from 'react';

import Box from '@/components/Box';
import { auth } from '@/lib/firebase';
import { useRouter } from 'expo-router';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    return auth().onAuthStateChanged(user => {
      if (!user) {
        router.replace('/(auth)/sign-in');
      } else if (!user.emailVerified) {
        router.replace('/(auth)/verify-email');
      } else {
        router.replace('/(app)/home');
      }
    });
  }, [router]);

  return <Box flex={1} backgroundColor="bgPrimary" />;
}
