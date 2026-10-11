import { useIntervalsConnection } from './useIntervalsConnection';
import { useNeedsReconnect } from './useNeedsReconnect';

export type IntervalsAvailability = 'loading' | 'unavailable' | 'available';

export type IntervalsAvailabilityState =
  | { availability: 'available'; accessToken: string; athleteId: string }
  | {
      availability: 'loading' | 'unavailable';
      accessToken: null;
      athleteId: null;
    };

/**
 * Whether Intervals.icu can be queried right now. The token and athlete id are
 * handed out only while it can, so every Intervals query gates on this and
 * none fires with a token already known to be bad.
 */
export function useIntervalsAvailability(): IntervalsAvailabilityState {
  const connection = useIntervalsConnection();
  const needsReconnect = useNeedsReconnect();

  if (connection.loading) {
    return { availability: 'loading', accessToken: null, athleteId: null };
  }

  if (
    !connection.isConnected ||
    !connection.accessToken ||
    !connection.athleteId ||
    needsReconnect
  ) {
    return { availability: 'unavailable', accessToken: null, athleteId: null };
  }

  return {
    availability: 'available',
    accessToken: connection.accessToken,
    athleteId: connection.athleteId,
  };
}
