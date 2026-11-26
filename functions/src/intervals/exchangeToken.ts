import {
  healthDataConsentDocPath,
  intervalsIntegrationDocPath,
} from '../firestorePaths';
import type {
  ExchangeIntervalsTokenResult,
  HealthDataAction,
  HealthDataConsentRecord,
  IntervalsIntegration,
} from './types';
import {
  exchangeIntervalsTokenDataSchema,
  intervalsTokenResponseSchema,
} from './types';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import * as v from 'valibot';

export const intervalsClientId = defineSecret('INTERVALS_CLIENT_ID');
export const intervalsClientSecret = defineSecret('INTERVALS_CLIENT_SECRET');

const TOKEN_URL = 'https://intervals.icu/api/oauth/token';
const HEALTH_DATA_SCOPE = 'WELLNESS:READ';

export async function exchangeIntervalsTokenHandler(
  request: CallableRequest<unknown>,
): Promise<ExchangeIntervalsTokenResult> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const dataParse = v.safeParse(exchangeIntervalsTokenDataSchema, request.data);

  if (!dataParse.success) {
    throw new HttpsError(
      'invalid-argument',
      'code, codeVerifier and a valid healthData action are required.',
    );
  }

  const { code, codeVerifier, healthData } = dataParse.output;

  let response: Response;

  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: intervalsClientId.value(),
        client_secret: intervalsClientSecret.value(),
        code,
        code_verifier: codeVerifier,
      }).toString(),
    });
  } catch {
    throw new HttpsError('unavailable', 'Could not reach Intervals.icu.');
  }

  if (!response.ok) {
    throw new HttpsError(
      'invalid-argument',
      'Intervals.icu rejected the authorization code.',
    );
  }

  const tokenParse = v.safeParse(
    intervalsTokenResponseSchema,
    await response.json(),
  );

  if (!tokenParse.success) {
    throw new HttpsError(
      'internal',
      'Intervals.icu returned an unexpected token response.',
    );
  }

  const tokenResponse = tokenParse.output;

  const integration: IntervalsIntegration = {
    accessToken: tokenResponse.access_token,
    athleteId: tokenResponse.athlete.id,
    athleteName: tokenResponse.athlete.name,
    scope: tokenResponse.scope,
    connectedAt: Timestamp.now(),
  };

  await getFirestore()
    .doc(intervalsIntegrationDocPath(request.auth.uid))
    .set(integration);

  return {
    athleteId: integration.athleteId,
    athleteName: integration.athleteName,
    healthDataConsentGiven: await applyHealthDataAction(
      request.auth.uid,
      healthData,
      grantsHealthData(integration.scope),
    ),
  };
}

function grantsHealthData(scope: string): boolean {
  return scope.split(/[\s,]+/).includes(HEALTH_DATA_SCOPE);
}

async function applyHealthDataAction(
  uid: string,
  healthData: HealthDataAction,
  healthDataGranted: boolean,
): Promise<boolean> {
  if (!healthDataGranted) return false;

  const consentDoc = getFirestore().doc(healthDataConsentDocPath(uid));

  if (healthData.action === 'keep') {
    return (await consentDoc.get()).exists;
  }

  const record: HealthDataConsentRecord = {
    givenAt: Timestamp.now(),
    consentVersion: healthData.consentVersion,
    ageConfirmed: true,
  };

  await consentDoc.set(record);

  return true;
}
