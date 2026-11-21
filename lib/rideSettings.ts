import type { AthleteRideSettings } from './intervalsApi';
import { type ZoneConfig, resolveZoneConfig } from './powerZones';

export interface RideSettings {
  zoneConfig: ZoneConfig;
  ftp: number | null;
}

export function resolveFtp(ftp: number | null | undefined): number | null {
  return typeof ftp === 'number' && Number.isFinite(ftp) && ftp > 0
    ? ftp
    : null;
}

export function resolveRideSettings(
  settings: AthleteRideSettings | null,
): RideSettings {
  return {
    zoneConfig: resolveZoneConfig(settings),
    ftp: resolveFtp(settings?.ftp),
  };
}

export function ftpPctToWatts(ftpPct: number, ftpWatts: number): number {
  return (ftpPct * ftpWatts) / 100;
}
