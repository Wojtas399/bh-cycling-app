import type { ScaleUnit } from './detailedProfile';

/**
 * Power in `unit`, rounded: `250 W` or `88%`. A range reads `220–233 W`, or
 * as one value when both ends round to it.
 */
export function formatPower(unit: ScaleUnit, low: number, high = low): string {
  const [from, to] = [Math.round(low), Math.round(high)];
  const value = from === to ? `${from}` : `${from}–${to}`;

  return unit === 'watts' ? `${value} W` : `${value}%`;
}
