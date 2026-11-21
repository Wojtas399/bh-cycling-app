import { formatDuration } from './formatDuration';
import { formatHeartRate } from './formatWorkoutMetric';
import type { IntervalsWellness } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

export interface WellnessRow {
  key: 'readiness' | 'sleep' | 'sleepScore' | 'hrv' | 'hrvSdnn' | 'restingHr';
  value: string;
}

export function toWellnessRows(entry: IntervalsWellness): WellnessRow[] {
  const metrics: [WellnessRow['key'], number | null | undefined, Format][] = [
    ['readiness', entry.readiness, whole],
    ['sleep', entry.sleepSecs, formatDuration],
    ['sleepScore', entry.sleepScore, whole],
    isFiniteNumber(entry.hrv)
      ? ['hrv', entry.hrv, milliseconds]
      : ['hrvSdnn', entry.hrvSDNN, milliseconds],
    ['restingHr', entry.restingHR, formatHeartRate],
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
