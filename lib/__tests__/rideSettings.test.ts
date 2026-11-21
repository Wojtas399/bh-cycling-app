import {
  ftpPctToWatts,
  resolveFtp,
  resolveRideSettings,
} from '../rideSettings';

describe('resolveFtp', () => {
  it('keeps a finite FTP above zero, in watts', () => {
    expect(resolveFtp(250)).toBe(250);
  });

  it.each([null, undefined, 0, -100, NaN, Infinity])(
    'is null when intervals.icu has no FTP no watts can come from: %s',
    ftp => {
      expect(resolveFtp(ftp)).toBeNull();
    },
  );
});

describe('resolveRideSettings', () => {
  it('falls back to Coggan zones and no FTP without settings', () => {
    expect(resolveRideSettings(null)).toEqual({
      zoneConfig: expect.arrayContaining([{ zone: 1, minPct: 0, maxPct: 55 }]),
      ftp: null,
    });
  });
});

describe('ftpPctToWatts', () => {
  it('reads a %FTP of the FTP in watts', () => {
    expect(ftpPctToWatts(88, 250)).toBe(220);
  });
});
