import { Timestamp } from 'firebase-admin/firestore';
import * as v from 'valibot';

export const intervalsIntegrationSchema = v.object({
  accessToken: v.string(),
  athleteId: v.string(),
  athleteName: v.string(),
  scope: v.string(),
  connectedAt: v.instance(Timestamp),
});

export type IntervalsIntegration = v.InferOutput<
  typeof intervalsIntegrationSchema
>;

export const intervalsTokenResponseSchema = v.object({
  access_token: v.string(),
  scope: v.string(),
  athlete: v.object({
    id: v.string(),
    name: v.string(),
  }),
});

export interface ExchangeIntervalsTokenData {
  code: string;
  codeVerifier: string;
}

export interface ExchangeIntervalsTokenResult {
  athleteId: string;
  athleteName: string;
}
