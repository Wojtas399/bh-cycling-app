import {
  CONNECTION_SCOPES,
  HEALTH_DATA_SCOPE,
  type IntervalsScope,
  lacksScope,
} from './intervalsScopes';

export type HealthDataConsentState =
  | 'given'
  | 'needsConsent'
  | 'needsReauthorization';

export type HealthDataConsentPrompt = Exclude<HealthDataConsentState, 'given'>;

export interface HealthDataConsentRecord {
  consentVersion: number;
}

export type HealthDataAction =
  | { action: 'grant'; consentVersion: number; ageConfirmed: true }
  | { action: 'keep' }
  | { action: 'withdraw' };

export interface IntervalsAuthorization {
  scopes: IntervalsScope[];
  healthData: HealthDataAction;
}

export interface HealthDataConsent {
  state: HealthDataConsentState;
  connect: IntervalsAuthorization;
  grant: IntervalsAuthorization;
  withdraw: IntervalsAuthorization;
}

const SCOPES_WITH_HEALTH_DATA: IntervalsScope[] = [
  ...CONNECTION_SCOPES,
  HEALTH_DATA_SCOPE,
];

export function healthDataConsent(
  record: HealthDataConsentRecord | null,
  grantedScope: string | null,
  currentVersion: number,
): HealthDataConsent {
  const hasCurrentRecord = record?.consentVersion === currentVersion;

  return {
    state: consentState(hasCurrentRecord, grantedScope),
    connect: {
      scopes: hasCurrentRecord
        ? SCOPES_WITH_HEALTH_DATA
        : [...CONNECTION_SCOPES],
      healthData: { action: 'keep' },
    },
    grant: {
      scopes: SCOPES_WITH_HEALTH_DATA,
      healthData: {
        action: 'grant',
        consentVersion: currentVersion,
        ageConfirmed: true,
      },
    },
    withdraw: {
      scopes: [...CONNECTION_SCOPES],
      healthData: { action: 'withdraw' },
    },
  };
}

function consentState(
  hasCurrentRecord: boolean,
  grantedScope: string | null,
): HealthDataConsentState {
  if (!hasCurrentRecord) return 'needsConsent';

  return lacksScope(grantedScope, HEALTH_DATA_SCOPE)
    ? 'needsReauthorization'
    : 'given';
}
