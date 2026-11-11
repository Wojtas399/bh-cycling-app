import type { AthleteRideSettings } from './intervalsApi';
import { type ZoneConfig, resolveZoneConfig } from './powerZones';

/** The athlete's current Ride settings, resolved for drawing. */
export interface RideSettings {
  zoneConfig: ZoneConfig;
  /** The current Ride FTP, W. `null` when there is none usable. */
  ftp: number | null;
}

/**
 * An FTP the app can draw watts from, in W: finite and above zero. `null`
 * when intervals.icu has none, or one no watts can come from.
 */
export function resolveFtp(ftp: number | null | undefined): number | null {
  return typeof ftp === 'number' && Number.isFinite(ftp) && ftp > 0
    ? ftp
    : null;
}

/**
 * Resolves the athlete's Ride settings: their zones, or Coggan's (see
 * `resolveZoneConfig`), and their FTP when it's usable.
 */
export function resolveRideSettings(
  settings: AthleteRideSettings | null,
): RideSettings {
  return {
    zoneConfig: resolveZoneConfig(settings),
    ftp: resolveFtp(settings?.ftp),
  };
}
