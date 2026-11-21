import { formatDuration } from './formatDuration';
import { formatStepDuration } from './formatStepDuration';

export function formatZoneTime(seconds: number): string {
  return seconds < 60 ? formatStepDuration(seconds) : formatDuration(seconds);
}
