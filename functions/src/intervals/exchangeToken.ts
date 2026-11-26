import { intervalsIntegrationDocPath } from '../firestorePaths';
import type {
  ExchangeIntervalsTokenData,
  ExchangeIntervalsTokenResult,
  IntervalsIntegration,
} from './types';
import { intervalsTokenResponseSchema } from './types';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import * as v from 'valibot';

export const intervalsClientId = defineSecret('INTERVALS_CLIENT_ID');
export const intervalsClientSecret = defineSecret('INTERVALS_CLIENT_SECRET');

const TOKEN_URL = 'https://intervals.icu/api/oauth/token';

export async function exchangeIntervalsTokenHandler(
  request: CallableRequest<ExchangeIntervalsTokenData>,
): Promise<ExchangeIntervalsTokenResult> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const { code, codeVerifier } = request.data ?? {};

  if (!code) {
    throw new HttpsError('invalid-argument', 'code is required.');
  }

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
  };
}
