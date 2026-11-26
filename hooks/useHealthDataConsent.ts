import { useSyncExternalStore } from 'react';

import { useHealthDataConsentRecord } from './useHealthDataConsentRecord';
import { useIntervalsConnection } from './useIntervalsConnection';
import { HEALTH_DATA_CONSENT_VERSION } from '@/constants/legal';
import {
  type HealthDataConsent,
  healthDataConsent,
} from '@/lib/healthDataConsent';
import {
  getHealthDataConsentWithdrawn,
  subscribeHealthDataConsentWithdrawn,
} from '@/lib/healthDataConsentWithdrawalStore';

export interface HealthDataConsentView extends HealthDataConsent {
  loading: boolean;
}

export function useHealthDataConsent(): HealthDataConsentView {
  const connection = useIntervalsConnection();
  const consentRecord = useHealthDataConsentRecord();
  const withdrawn = useSyncExternalStore(
    subscribeHealthDataConsentWithdrawn,
    getHealthDataConsentWithdrawn,
  );

  return {
    loading: connection.loading || consentRecord.loading,
    ...healthDataConsent(
      withdrawn ? null : consentRecord.record,
      connection.scope,
      HEALTH_DATA_CONSENT_VERSION,
    ),
  };
}
