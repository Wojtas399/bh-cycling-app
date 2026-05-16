import { useEffect } from 'react';

import Box from '@/components/Box';
import { auth } from '@/lib/firebase';
import { useRouter } from 'expo-router';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    return auth().onAuthStateChanged(user => {
      if (user) {
        router.replace('/(app)');
      } else {
        router.replace('/(auth)/sign-in');
      }
    });
  }, []);

  return <Box flex={1} backgroundColor="bgPrimary" />;
}
