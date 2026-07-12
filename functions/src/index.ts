import { disconnectIntervalsHandler } from './intervals/disconnect';
import {
  exchangeIntervalsTokenHandler,
  intervalsClientSecret,
} from './intervals/exchangeToken';
import { getApps, initializeApp } from 'firebase-admin/app';
import { onCall } from 'firebase-functions/v2/https';

if (!getApps().length) {
  initializeApp();
}

export const exchangeIntervalsToken = onCall(
  { secrets: [intervalsClientSecret] },
  exchangeIntervalsTokenHandler,
);

export const disconnectIntervals = onCall(disconnectIntervalsHandler);
