import {
  ftpPctToWatts,
  resolveFtp,
  resolveRideSettings,
} from '../rideSettings';

describe('resolveFtp', () => {
  it('keeps a usable FTP in watts', () => {
    expect(resolveFtp(250)).toBe(250);
  });

  it('is null when intervals.icu has no FTP', () => {
    expect(resolveFtp(null)).toBeNull();
    expect(resolveFtp(undefined)).toBeNull();
  });

  it.each([0, -10, NaN, Infinity])(
    'is null for an FTP of %s, which no watts can come from',
    ftp => {
      expect(resolveFtp(ftp)).toBeNull();
    },
  );
});

describe('resolveRideSettings', () => {
  it('has no FTP without Ride settings', () => {
    expect(resolveRideSettings(null).ftp).toBeNull();
  });
});

describe('ftpPctToWatts', () => {
  it('turns a %FTP into watts', () => {
    expect(ftpPctToWatts(90, 250)).toBe(225);
  });
});
