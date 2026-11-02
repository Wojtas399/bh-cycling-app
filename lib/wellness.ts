import { formatDuration } from './formatDuration';
import type { IntervalsWellness } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

/** A Wellness card row; its label is looked up by `key`. */
export interface WellnessRow {
  key: 'readiness' | 'sleep' | 'sleepScore' | 'hrv' | 'hrvSdnn' | 'restingHr';
  /** Formatted for display, unit included. */
  value: string;
}

/**
 * The metrics a Wellness Entry has today, in the card's fixed order, each
 * formatted exactly as intervals.icu sent it: rounding is the only arithmetic.
 * Only a `null` or absent metric is left out, so a `0` shows. SDNN stands in
 * for HRV only when rMSSD is missing, and the two never show together.
 */
export function toWellnessRows(entry: IntervalsWellness): WellnessRow[] {
  const metrics: [WellnessRow['key'], number | null | undefined, Format][] = [
    ['readiness', entry.readiness, whole],
    ['sleep', entry.sleepSecs, formatDuration],
    ['sleepScore', entry.sleepScore, whole],
    isFiniteNumber(entry.hrv)
      ? ['hrv', entry.hrv, milliseconds]
      : ['hrvSdnn', entry.hrvSDNN, milliseconds],
    ['restingHr', entry.restingHR, beatsPerMinute],
  ];

  return metrics.flatMap(([key, value, format]) =>
    isFiniteNumber(value) ? [{ key, value: format(value) }] : [],
  );
}

type Format = (value: number) => string;

function whole(value: number): string {
  return `${Math.round(value)}`;
}

function milliseconds(value: number): string {
  return `${whole(value)} ms`;
}

function beatsPerMinute(value: number): string {
  return `${whole(value)} bpm`;
}

/**
 * Whether a stored Intervals.icu scope shows `WELLNESS:READ` wasn't granted,
 * so no Wellness request needs to go out to be refused. Only that scope is
 * checked. Intervals.icu separates scopes with commas, OAuth with spaces; both
 * are read. An unknown scope shows nothing, and the request itself decides.
 */
export function lacksWellnessScope(scope: string | null): boolean {
  return scope !== null && !scope.split(/[\s,]+/).includes('WELLNESS:READ');
}
