import { isFiniteNumber } from './isFiniteNumber';
import {
  type Zone,
  type ZoneConfig,
  bandForZone,
  zoneForFtpPercent,
} from './powerZones';
import type { StepTarget } from './workoutProfile';

export interface StepSpan {
  start: number;
  end: number;
}

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

export interface ResolvedPower {
  zone: Zone;
  ftpPct: StepSpan;
}

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
