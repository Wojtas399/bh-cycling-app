import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useRouter } from 'expo-router';

export function useReconnectIntervals(): () => void {
  const router = useRouter();
  const { handleConnect } = useIntervalsAuth();

  return () => {
    router.push('/(app)/(tabs)/settings');
    handleConnect();
  };
}
