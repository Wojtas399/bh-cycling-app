import type {
  ExchangeIntervalsTokenData,
  ExchangeIntervalsTokenResult,
  IntervalsIntegration,
  IntervalsTokenResponse,
} from './types';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { type CallableRequest, HttpsError } from 'firebase-functions/v2/https';

export const intervalsClientSecret = defineSecret('INTERVALS_CLIENT_SECRET');

const TOKEN_URL = 'https://intervals.icu/api/oauth/token';
const REDIRECT_URI = 'blackhorsecyclingapp://oauth/intervals';

export async function exchangeIntervalsTokenHandler(
  request: CallableRequest<ExchangeIntervalsTokenData>,
): Promise<ExchangeIntervalsTokenResult> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const { code, clientId } = request.data ?? {};

  if (!code || !clientId) {
    throw new HttpsError('invalid-argument', 'code and clientId are required.');
  }

  let response: Response;

  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: intervalsClientSecret.value(),
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
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

  const tokenResponse = (await response.json()) as IntervalsTokenResponse;

  const integration: IntervalsIntegration = {
    accessToken: tokenResponse.access_token,
    athleteId: tokenResponse.athlete.id,
    athleteName: tokenResponse.athlete.name,
    scope: tokenResponse.scope,
    connectedAt: Timestamp.now(),
  };

  await getFirestore()
    .doc(`users/${request.auth.uid}/integrations/intervals`)
    .set(integration);

  return {
    athleteId: integration.athleteId,
    athleteName: integration.athleteName,
  };
}
