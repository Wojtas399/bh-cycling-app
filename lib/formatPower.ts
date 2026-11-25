import type { ScaleUnit } from './profileCard';

export function formatPower(unit: ScaleUnit, low: number, high = low): string {
  const [from, to] = [Math.round(low), Math.round(high)];
  const value = from === to ? `${from}` : `${from}–${to}`;

  return unit === 'watts' ? `${value} W` : `${value}%`;
}
