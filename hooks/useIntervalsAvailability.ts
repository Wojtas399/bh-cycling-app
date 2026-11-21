import { useIntervalsConnection } from './useIntervalsConnection';
import { useNeedsReconnect } from './useNeedsReconnect';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';

export type IntervalsAvailability = 'loading' | 'unavailable' | 'available';

export type IntervalsAvailabilityState =
  | { availability: 'available'; credentials: IntervalsCredentials }
  | { availability: 'loading' | 'unavailable'; credentials: null };

export function useIntervalsAvailability(): IntervalsAvailabilityState {
  const connection = useIntervalsConnection();
  const needsReconnect = useNeedsReconnect();

  if (connection.loading) {
    return { availability: 'loading', credentials: null };
  }

  if (
    !connection.isConnected ||
    !connection.accessToken ||
    !connection.athleteId ||
    needsReconnect
  ) {
    return { availability: 'unavailable', credentials: null };
  }

  return {
    availability: 'available',
    credentials: {
      accessToken: connection.accessToken,
      athleteId: connection.athleteId,
    },
  };
}
