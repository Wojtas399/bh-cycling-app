import { useIntervalsConnection } from './useIntervalsConnection';
import { useNeedsReconnect } from './useNeedsReconnect';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';

export type IntervalsAvailability = 'loading' | 'unavailable' | 'available';

export type IntervalsAvailabilityState =
  | { availability: 'available'; credentials: IntervalsCredentials }
  | { availability: 'loading' | 'unavailable'; credentials: null };

/**
 * Whether Intervals.icu can be queried right now. The credentials are handed
 * out only while it can, so every Intervals query is skipped without them and
 * none fires with a token already known to be bad.
 */
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
