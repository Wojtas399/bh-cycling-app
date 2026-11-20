import type { AthleteRideSettings, Watts } from './intervalsApi';
import { type ZoneConfig, resolveZoneConfig } from './powerZones';

export interface RideSettings {
  zoneConfig: ZoneConfig;
  ftp: Watts | null;
}

export function resolveFtp(ftp: Watts | null | undefined): Watts | null {
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

export function ftpPctToWatts(ftpPct: number, ftpWatts: Watts): Watts {
  return (ftpPct * ftpWatts) / 100;
}
