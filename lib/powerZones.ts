import type { Percent } from './intervalsApi';

const ZONES = [1, 2, 3, 4, 5, 6, 7] as const;

export type Zone = (typeof ZONES)[number];

export function isZone(zone: number | null | undefined): zone is Zone {
  return ZONES.some(candidate => candidate === zone);
}

export interface ZoneBand {
  zone: Zone;
  minPct: number;
  maxPct: number;
}

export type ZoneConfig = ZoneBand[];

export interface AthleteZoneSettings {
  powerZones?: Percent[] | null;
}

const MAX_ZONES = ZONES.length;

const COGGAN_ZONE_CEILINGS = [55, 75, 90, 105, 120, 150, 200];

function areUsableCeilings(
  ceilings: number[] | null | undefined,
): ceilings is number[] {
  return (
    Array.isArray(ceilings) &&
    ceilings.length > 0 &&
    ceilings.length <= MAX_ZONES &&
    ceilings.every(
      (ceiling, index) =>
        typeof ceiling === 'number' &&
        Number.isFinite(ceiling) &&
        ceiling > (index === 0 ? 0 : ceilings[index - 1]),
    )
  );
}

function toZoneConfig(ceilings: number[]): ZoneConfig {
  return ceilings.map((maxPct, index) => ({
    zone: ZONES[index],
    minPct: index === 0 ? 0 : ceilings[index - 1],
    maxPct,
  }));
}

export function resolveZoneConfig(
  settings?: AthleteZoneSettings | null,
): ZoneConfig {
  const ceilings = settings?.powerZones;

  return toZoneConfig(
    areUsableCeilings(ceilings) ? ceilings : COGGAN_ZONE_CEILINGS,
  );
}

export function bandForZone(zone: number, config: ZoneConfig): ZoneBand {
  const index = Math.min(Math.max(Math.round(zone), 1), config.length) - 1;

  return config[index];
}

export function zoneForFtpPercent(
  ftpPercent: number,
  config: ZoneConfig,
): Zone {
  const band = config.find(candidate => ftpPercent <= candidate.maxPct);

  return band ? band.zone : config[config.length - 1].zone;
}
