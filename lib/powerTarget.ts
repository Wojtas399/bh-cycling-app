import { isFiniteNumber } from './isFiniteNumber';
import {
  type Zone,
  type ZoneConfig,
  bandForZone,
  zoneForFtpPercent,
} from './powerZones';
import type { StepTarget } from './workoutProfile';

/**
 * A target as a span, in its step's order: a range or ramp runs `start` to
 * `end`, and a single value has `start === end`.
 */
export interface StepSpan {
  start: number;
  end: number;
}

/**
 * Reads a target as a span. A range (or ramp) wins over a single value because
 * it is the wider truth; a range with one end missing collapses to the other.
 */
export function toSpan(target: StepTarget | undefined): StepSpan | undefined {
  if (!target) return undefined;

  const start = isFiniteNumber(target.start) ? target.start : undefined;
  const end = isFiniteNumber(target.end) ? target.end : undefined;

  if (start !== undefined) return { start, end: end ?? start };

  if (end !== undefined) return { start: end, end };

  if (isFiniteNumber(target.value)) {
    return { start: target.value, end: target.value };
  }

  return undefined;
}

/** A step's Power Target on the %FTP axis, and the zone it is coloured by. */
export interface ResolvedPower {
  zone: Zone;
  ftpPct: StepSpan;
}

/**
 * Resolves a step's Power Target to %FTP. A `power_zone` target reads as that
 * zone's band; a `%ftp` span is coloured by its middle, the average power that
 * decides which zone the effort trains. Any other unit has no %FTP reading.
 */
export function resolvePowerTarget(
  target: StepTarget | undefined,
  config: ZoneConfig,
): ResolvedPower | null {
  if (target?.units === 'power_zone' && isFiniteNumber(target.value)) {
    const band = bandForZone(target.value, config);

    return {
      zone: band.zone,
      ftpPct: { start: band.minPct, end: band.maxPct },
    };
  }

  const ftpPct = target?.units === '%ftp' ? toSpan(target) : undefined;

  if (!ftpPct) return null;

  return {
    zone: zoneForFtpPercent((ftpPct.start + ftpPct.end) / 2, config),
    ftpPct,
  };
}
