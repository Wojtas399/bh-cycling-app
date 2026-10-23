import { addSecondsToLocalDateTime, formatLocalTime } from '../localDateTime';

describe('addSecondsToLocalDateTime', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('adds the seconds to the wall-clock time', () => {
    expect(addSecondsToLocalDateTime('2026-10-17T07:05:00', 5700)).toBe(
      '2026-10-17T08:40:00',
    );
  });

  it('rolls over midnight into the next day', () => {
    expect(addSecondsToLocalDateTime('2026-10-17T23:30:00', 3600)).toBe(
      '2026-10-18T00:30:00',
    );
  });

  it('rolls over the end of a month and a year', () => {
    expect(addSecondsToLocalDateTime('2026-12-31T22:00:00', 7200)).toBe(
      '2027-01-01T00:00:00',
    );
  });

  it('keeps seconds', () => {
    expect(addSecondsToLocalDateTime('2026-10-17T07:05:12', 61)).toBe(
      '2026-10-17T07:06:13',
    );
  });

  it.each(['Europe/Warsaw', 'America/New_York', 'Asia/Kathmandu'])(
    'ignores the device timezone (%s), even across its DST change',
    tz => {
      process.env.TZ = tz;

      // 25 Oct 2026 is the end of DST in Europe; 1 Nov 2026 in the US.
      expect(addSecondsToLocalDateTime('2026-10-25T01:30:00', 7200)).toBe(
        '2026-10-25T03:30:00',
      );
      expect(addSecondsToLocalDateTime('2026-11-01T00:30:00', 7200)).toBe(
        '2026-11-01T02:30:00',
      );
    },
  );

  it('accepts a date-time without seconds', () => {
    expect(addSecondsToLocalDateTime('2026-10-17T07:05', 60)).toBe(
      '2026-10-17T07:06:00',
    );
  });
});

describe('formatLocalTime', () => {
  it('formats the time as H:mm, without a leading zero on the hour', () => {
    expect(formatLocalTime('2026-10-17T07:05:00')).toBe('7:05');
  });

  it('keeps two-digit hours', () => {
    expect(formatLocalTime('2026-10-17T18:40:59')).toBe('18:40');
  });

  it('shows midnight as 0:00', () => {
    expect(formatLocalTime('2026-10-18T00:00:00')).toBe('0:00');
  });
});
