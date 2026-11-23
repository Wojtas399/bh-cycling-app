import {
  type IntervalsConnectionState,
  useIntervalsConnection,
} from '@/hooks/useIntervalsConnection';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const FULL_CONSENT_SCOPE =
  'ACTIVITY:READ,CALENDAR:READ,WELLNESS:READ,SETTINGS:READ';

const NOT_CONNECTED: IntervalsConnectionState = {
  isConnected: false,
  athleteName: null,
  athleteId: null,
  accessToken: null,
  scope: null,
  loading: false,
};

function mockConnectionState(state: IntervalsConnectionState): void {
  jest.mocked(useIntervalsConnection).mockReturnValue(state);
}

export function connectIntervals({
  scope = FULL_CONSENT_SCOPE,
}: { scope?: string } = {}): void {
  mockConnectionState({
    ...NOT_CONNECTED,
    isConnected: true,
    athleteId: 'athlete-1',
    accessToken: 'token-1',
    scope,
  });
}

export function disconnectIntervals(): void {
  mockConnectionState(NOT_CONNECTED);
}

export function intervalsConnectionLoading(): void {
  mockConnectionState({ ...NOT_CONNECTED, loading: true });
}
