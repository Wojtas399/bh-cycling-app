export type Zone = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Whether `zone` is one of Z1–Z7. */
export function isZone(zone: number | null | undefined): zone is Zone {
  return zone != null && Number.isInteger(zone) && zone >= 1 && zone <= 7;
}

export interface ZoneBand {
  zone: Zone;
  /** Lower edge of the band, in %FTP. Exclusive; 0 for Z1. */
  minPct: number;
  /** Upper edge of the band, in %FTP. Inclusive. */
  maxPct: number;
}

export type ZoneConfig = ZoneBand[];

/**
 * The slice of the athlete settings this module reads. Sweet Spot lives on the
 * same settings payload but is deliberately not modelled here: it overlaps Z3
 * and Z4, so admitting it as a zone would double-count that power.
 */
export interface AthleteZoneSettings {
  /** Ascending zone ceilings in %FTP, one per zone. */
  powerZones?: number[] | null;
}

/** The highest zone we resolve — Z1–Z7, Sweet Spot excluded. */
const MAX_ZONES = 7;

/** Standard Coggan zone ceilings in %FTP, used when athlete settings are unavailable. */
const COGGAN_ZONE_CEILINGS = [55, 75, 90, 105, 120, 150, 200];

/**
 * Zone ceilings we can build a config from: one to seven of them, every value
 * finite and strictly ascending from zero.
 */
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
    zone: (index + 1) as Zone,
    minPct: index === 0 ? 0 : ceilings[index - 1],
    maxPct,
  }));
}

/**
 * Resolves the athlete's zone configuration, in %FTP. Falls back to the
 * standard Coggan bands whenever settings are absent or unusable, so callers
 * always get a workable config.
 */
export function resolveZoneConfig(
  settings?: AthleteZoneSettings | null,
): ZoneConfig {
  const ceilings = settings?.powerZones;

  return toZoneConfig(
    areUsableCeilings(ceilings) ? ceilings : COGGAN_ZONE_CEILINGS,
  );
}

/**
 * Resolves a Power Target expressed as `power_zone: N` to its %FTP band.
 * A zone number outside the configured range clamps to the nearest band.
 */
export function bandForZone(zone: number, config: ZoneConfig): ZoneBand {
  const index = Math.min(Math.max(Math.round(zone), 1), config.length) - 1;

  return config[index];
}

/**
 * Buckets a %FTP value into its Zone. Bands are lower-exclusive and
 * upper-inclusive, so a value sitting on a boundary belongs to the lower zone.
 * Values outside the configured range clamp to the lowest/highest zone.
 */
export function zoneForFtpPercent(
  ftpPercent: number,
  config: ZoneConfig,
): Zone {
  const band = config.find(candidate => ftpPercent <= candidate.maxPct);

  return band ? band.zone : config[config.length - 1].zone;
}
