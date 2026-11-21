import { useAuthState } from '@/hooks/useAuthState';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  const authState = useAuthState();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={authState === 'signedOut'}>
        <Stack.Screen name="sign-in/index" />
        <Stack.Screen name="sign-up/index" />
        <Stack.Screen name="forgot-password/index" />
      </Stack.Protected>
      <Stack.Protected guard={authState === 'unverified'}>
        <Stack.Screen name="verify-email/index" />
      </Stack.Protected>
    </Stack>
  );
}
