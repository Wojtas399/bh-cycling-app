import { deleteAccountHandler } from './account/deleteAccount';
import { disconnectIntervalsHandler } from './intervals/disconnect';
import {
  exchangeIntervalsTokenHandler,
  intervalsClientId,
  intervalsClientSecret,
} from './intervals/exchangeToken';
import { getApps, initializeApp } from 'firebase-admin/app';
import { onCall } from 'firebase-functions/v2/https';

if (!getApps().length) {
  initializeApp();
}

export const exchangeIntervalsToken = onCall(
  { secrets: [intervalsClientId, intervalsClientSecret] },
  exchangeIntervalsTokenHandler,
);

export const disconnectIntervals = onCall(disconnectIntervalsHandler);

export const deleteAccount = onCall(deleteAccountHandler);
