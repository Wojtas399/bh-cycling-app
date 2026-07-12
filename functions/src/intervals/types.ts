import type { Timestamp } from 'firebase-admin/firestore';

export interface IntervalsIntegration {
  accessToken: string;
  athleteId: string;
  athleteName: string;
  scope: string;
  connectedAt: Timestamp;
}

export interface IntervalsTokenResponse {
  access_token: string;
  scope: string;
  athlete: {
    id: string;
    name: string;
  };
}

export interface ExchangeIntervalsTokenData {
  code: string;
  clientId: string;
}

export interface ExchangeIntervalsTokenResult {
  athleteId: string;
  athleteName: string;
}
