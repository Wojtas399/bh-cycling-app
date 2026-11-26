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

export const healthDataActionSchema = v.variant('action', [
  v.object({
    action: v.literal('grant'),
    consentVersion: v.pipe(v.number(), v.integer(), v.minValue(1)),
    ageConfirmed: v.literal(true),
  }),
  v.object({ action: v.literal('keep') }),
]);

export type HealthDataAction = v.InferOutput<typeof healthDataActionSchema>;

export const exchangeIntervalsTokenDataSchema = v.object({
  code: v.pipe(v.string(), v.nonEmpty()),
  codeVerifier: v.pipe(v.string(), v.nonEmpty()),
  healthData: healthDataActionSchema,
});

export interface HealthDataConsentRecord {
  givenAt: Timestamp;
  consentVersion: number;
  ageConfirmed: true;
}

export interface ExchangeIntervalsTokenResult {
  athleteId: string;
  athleteName: string;
  healthDataConsentGiven: boolean;
}
