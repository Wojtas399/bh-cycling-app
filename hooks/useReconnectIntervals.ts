import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useRouter } from 'expo-router';

/**
 * Reconnects Intervals.icu from outside Settings: opens Settings and starts the
 * connect flow straight away, so the athlete doesn't have to find the button.
 */
export function useReconnectIntervals(): () => void {
  const router = useRouter();
  const { handleConnect } = useIntervalsAuth();

  return () => {
    router.push('/(app)/(tabs)/settings');
    void handleConnect();
  };
}
