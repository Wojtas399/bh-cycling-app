import { resolvePowerTarget, toSpan } from '../powerTarget';
import { resolveZoneConfig } from '../powerZones';

const COGGAN = resolveZoneConfig();

describe('toSpan', () => {
  it('reads a single value as a span with equal ends', () => {
    expect(toSpan({ value: 88 })).toEqual({ start: 88, end: 88 });
  });

  it('keeps a range or ramp in its order, start to end', () => {
    expect(toSpan({ start: 75, end: 45 })).toEqual({ start: 75, end: 45 });
  });

  it('prefers the range over a single value, as the wider truth', () => {
    expect(toSpan({ value: 90, start: 85, end: 95 })).toEqual({
      start: 85,
      end: 95,
    });
  });

  it('collapses a range with one end missing to the other end', () => {
    expect(toSpan({ start: 70 })).toEqual({ start: 70, end: 70 });
    expect(toSpan({ end: 80 })).toEqual({ start: 80, end: 80 });
  });

  it('has no span without a target or any finite number', () => {
    expect(toSpan(undefined)).toBeUndefined();
    expect(toSpan({ value: NaN })).toBeUndefined();
  });
});

describe('resolvePowerTarget', () => {
  it('reads a power_zone target as that zone band', () => {
    expect(
      resolvePowerTarget({ units: 'power_zone', value: 3 }, COGGAN),
    ).toEqual({ zone: 3, ftpPct: { start: 75, end: 90 } });
  });

  it('colours a %ftp span by its middle, the average power it trains', () => {
    expect(
      resolvePowerTarget({ units: '%ftp', start: 50, end: 90 }, COGGAN),
    ).toEqual({ zone: 2, ftpPct: { start: 50, end: 90 } });
  });

  it('has no %FTP reading for any other unit', () => {
    expect(resolvePowerTarget({ units: 'w', value: 250 }, COGGAN)).toBeNull();
    expect(resolvePowerTarget(undefined, COGGAN)).toBeNull();
  });
});
