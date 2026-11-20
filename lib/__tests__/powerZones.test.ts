import {
  bandForZone,
  isZone,
  resolveZoneConfig,
  zoneForFtpPercent,
} from '../powerZones';

const COGGAN_CONFIG = [
  { zone: 1, minPct: 0, maxPct: 55 },
  { zone: 2, minPct: 55, maxPct: 75 },
  { zone: 3, minPct: 75, maxPct: 90 },
  { zone: 4, minPct: 90, maxPct: 105 },
  { zone: 5, minPct: 105, maxPct: 120 },
  { zone: 6, minPct: 120, maxPct: 150 },
  { zone: 7, minPct: 150, maxPct: 200 },
];

const CUSTOM_CEILINGS = [60, 80, 95, 110, 130, 160, 220];

describe('powerZones', () => {
  it.each([1, 4, 7])('isZone accepts zone %s', zone => {
    expect(isZone(zone)).toBe(true);
  });

  it.each([0, 8, 2.5, NaN, null, undefined])('isZone rejects %s', zone => {
    expect(isZone(zone)).toBe(false);
  });

  it('resolveZoneConfig falls back to the standard Coggan bands when settings are absent', () => {
    expect(resolveZoneConfig()).toEqual(COGGAN_CONFIG);
  });

  it('resolveZoneConfig falls back to Coggan when the athlete has no power zones', () => {
    expect(resolveZoneConfig(null)).toEqual(COGGAN_CONFIG);
    expect(resolveZoneConfig({})).toEqual(COGGAN_CONFIG);
    expect(resolveZoneConfig({ powerZones: null })).toEqual(COGGAN_CONFIG);
    expect(resolveZoneConfig({ powerZones: [] })).toEqual(COGGAN_CONFIG);
  });

  it('resolveZoneConfig falls back to Coggan when the boundaries are not usable', () => {
    expect(resolveZoneConfig({ powerZones: [80, 60, 95] })).toEqual(
      COGGAN_CONFIG,
    );
    expect(resolveZoneConfig({ powerZones: [55, 55, 90] })).toEqual(
      COGGAN_CONFIG,
    );
    expect(resolveZoneConfig({ powerZones: [-10, 60, 90] })).toEqual(
      COGGAN_CONFIG,
    );
    expect(resolveZoneConfig({ powerZones: [55, NaN, 90] })).toEqual(
      COGGAN_CONFIG,
    );
  });

  it('resolveZoneConfig falls back to Coggan when more than seven zones are configured', () => {
    expect(
      resolveZoneConfig({ powerZones: [40, 55, 70, 85, 100, 115, 130, 250] }),
    ).toEqual(COGGAN_CONFIG);
  });

  it('resolveZoneConfig builds bands from the athlete customized boundaries', () => {
    expect(resolveZoneConfig({ powerZones: CUSTOM_CEILINGS })).toEqual([
      { zone: 1, minPct: 0, maxPct: 60 },
      { zone: 2, minPct: 60, maxPct: 80 },
      { zone: 3, minPct: 80, maxPct: 95 },
      { zone: 4, minPct: 95, maxPct: 110 },
      { zone: 5, minPct: 110, maxPct: 130 },
      { zone: 6, minPct: 130, maxPct: 160 },
      { zone: 7, minPct: 160, maxPct: 220 },
    ]);
  });

  it('resolveZoneConfig supports a customized zone count below seven', () => {
    const config = resolveZoneConfig({ powerZones: [50, 70, 90, 110, 140] });

    expect(config).toHaveLength(5);
    expect(config[4]).toEqual({ zone: 5, minPct: 110, maxPct: 140 });
    expect(zoneForFtpPercent(200, config)).toBe(5);
    expect(bandForZone(7, config)).toEqual(config[4]);
  });

  it('resolveZoneConfig ignores Sweet Spot bounds on the settings payload, since Sweet Spot overlaps Z3 and Z4', () => {
    const withSweetSpot = {
      powerZones: CUSTOM_CEILINGS,
      sweetSpotMin: 84,
      sweetSpotMax: 97,
    };

    expect(resolveZoneConfig(withSweetSpot)).toEqual(
      resolveZoneConfig({ powerZones: CUSTOM_CEILINGS }),
    );
    expect(resolveZoneConfig(withSweetSpot).map(band => band.zone)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('zoneForFtpPercent buckets a %FTP value into the zone that contains it', () => {
    const config = resolveZoneConfig();

    expect(zoneForFtpPercent(40, config)).toBe(1);
    expect(zoneForFtpPercent(65, config)).toBe(2);
    expect(zoneForFtpPercent(85, config)).toBe(3);
    expect(zoneForFtpPercent(100, config)).toBe(4);
    expect(zoneForFtpPercent(112, config)).toBe(5);
    expect(zoneForFtpPercent(135, config)).toBe(6);
    expect(zoneForFtpPercent(180, config)).toBe(7);
  });

  it('zoneForFtpPercent assigns a value sitting exactly on a boundary to the lower zone', () => {
    const config = resolveZoneConfig();

    expect(zoneForFtpPercent(55, config)).toBe(1);
    expect(zoneForFtpPercent(75, config)).toBe(2);
    expect(zoneForFtpPercent(90, config)).toBe(3);
    expect(zoneForFtpPercent(105, config)).toBe(4);
    expect(zoneForFtpPercent(120, config)).toBe(5);
    expect(zoneForFtpPercent(150, config)).toBe(6);
  });

  it('zoneForFtpPercent moves up a zone just across a boundary', () => {
    const config = resolveZoneConfig();

    expect(zoneForFtpPercent(55.1, config)).toBe(2);
    expect(zoneForFtpPercent(75.1, config)).toBe(3);
    expect(zoneForFtpPercent(90.1, config)).toBe(4);
    expect(zoneForFtpPercent(105.1, config)).toBe(5);
    expect(zoneForFtpPercent(120.1, config)).toBe(6);
    expect(zoneForFtpPercent(150.1, config)).toBe(7);
  });

  it('zoneForFtpPercent clamps values outside the configured range', () => {
    const config = resolveZoneConfig();

    expect(zoneForFtpPercent(200, config)).toBe(7);
    expect(zoneForFtpPercent(320, config)).toBe(7);
    expect(zoneForFtpPercent(0, config)).toBe(1);
    expect(zoneForFtpPercent(-10, config)).toBe(1);
  });

  it("zoneForFtpPercent buckets against the customized boundaries, so 78% FTP is this athlete's Z2, not Coggan's Z3", () => {
    const config = resolveZoneConfig({ powerZones: CUSTOM_CEILINGS });

    expect(zoneForFtpPercent(78, config)).toBe(2);
    expect(zoneForFtpPercent(100, config)).toBe(4);
  });

  it('zoneForFtpPercent maps values inside the Sweet Spot range to their underlying zone', () => {
    const config = resolveZoneConfig();

    expect(zoneForFtpPercent(88, config)).toBe(3);
    expect(zoneForFtpPercent(95, config)).toBe(4);
  });

  it('bandForZone returns the %FTP band of each power_zone', () => {
    const config = resolveZoneConfig();

    expect(bandForZone(1, config)).toEqual({ zone: 1, minPct: 0, maxPct: 55 });
    expect(bandForZone(2, config)).toEqual({ zone: 2, minPct: 55, maxPct: 75 });
    expect(bandForZone(3, config)).toEqual({ zone: 3, minPct: 75, maxPct: 90 });
    expect(bandForZone(4, config)).toEqual({
      zone: 4,
      minPct: 90,
      maxPct: 105,
    });
    expect(bandForZone(5, config)).toEqual({
      zone: 5,
      minPct: 105,
      maxPct: 120,
    });
    expect(bandForZone(6, config)).toEqual({
      zone: 6,
      minPct: 120,
      maxPct: 150,
    });
    expect(bandForZone(7, config)).toEqual({
      zone: 7,
      minPct: 150,
      maxPct: 200,
    });
  });

  it('bandForZone clamps a power_zone outside the configured range to the nearest band', () => {
    const config = resolveZoneConfig();

    expect(bandForZone(0, config)).toEqual(bandForZone(1, config));
    expect(bandForZone(9, config)).toEqual(bandForZone(7, config));
  });
});
