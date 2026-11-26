import { useHealthDataConsentRecord } from './useHealthDataConsentRecord';
import { useIntervalsConnection } from './useIntervalsConnection';
import { HEALTH_DATA_CONSENT_VERSION } from '@/constants/legal';
import {
  type HealthDataConsent,
  healthDataConsent,
} from '@/lib/healthDataConsent';

export interface HealthDataConsentView extends HealthDataConsent {
  loading: boolean;
}

export function useHealthDataConsent(): HealthDataConsentView {
  const connection = useIntervalsConnection();
  const consentRecord = useHealthDataConsentRecord();

  return {
    loading: connection.loading || consentRecord.loading,
    ...healthDataConsent(
      consentRecord.record,
      connection.scope,
      HEALTH_DATA_CONSENT_VERSION,
    ),
  };
}
