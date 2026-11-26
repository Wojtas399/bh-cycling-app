import { HEALTH_DATA_CONSENT_VERSION } from '@/constants/legal';
import {
  type HealthDataConsentRecordState,
  useHealthDataConsentRecord,
} from '@/hooks/useHealthDataConsentRecord';
import {
  type IntervalsConnectionState,
  useIntervalsConnection,
} from '@/hooks/useIntervalsConnection';
import type { HealthDataConsentRecord } from '@/lib/healthDataConsent';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/hooks/useHealthDataConsentRecord', () => ({
  useHealthDataConsentRecord: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const FULL_CONSENT_SCOPE =
  'ACTIVITY:READ,CALENDAR:READ,WELLNESS:READ,SETTINGS:READ';

const CURRENT_HEALTH_DATA_CONSENT: HealthDataConsentRecord = {
  consentVersion: HEALTH_DATA_CONSENT_VERSION,
};

const NOT_CONNECTED: IntervalsConnectionState = {
  isConnected: false,
  athleteName: null,
  athleteId: null,
  accessToken: null,
  scope: null,
  loading: false,
};

const NO_CONSENT_RECORD: HealthDataConsentRecordState = {
  loading: false,
  record: null,
};

function mockConnectionState(
  state: IntervalsConnectionState,
  consentRecord: HealthDataConsentRecordState,
): void {
  jest.mocked(useIntervalsConnection).mockReturnValue(state);
  jest.mocked(useHealthDataConsentRecord).mockReturnValue(consentRecord);
}

export function connectIntervals({
  scope = FULL_CONSENT_SCOPE,
  healthDataConsent = CURRENT_HEALTH_DATA_CONSENT,
}: {
  scope?: string;
  healthDataConsent?: HealthDataConsentRecord | null | 'loading';
} = {}): void {
  mockConnectionState(
    {
      ...NOT_CONNECTED,
      isConnected: true,
      athleteId: 'athlete-1',
      accessToken: 'token-1',
      scope,
    },
    healthDataConsent === 'loading'
      ? { loading: true, record: null }
      : { loading: false, record: healthDataConsent },
  );
}

export function disconnectIntervals(): void {
  mockConnectionState(NOT_CONNECTED, NO_CONSENT_RECORD);
}

export function intervalsConnectionLoading(): void {
  mockConnectionState(
    { ...NOT_CONNECTED, loading: true },
    { loading: true, record: null },
  );
}
