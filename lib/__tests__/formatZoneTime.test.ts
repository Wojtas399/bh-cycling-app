import { formatZoneTime } from '@/lib/formatZoneTime';

describe('formatZoneTime', () => {
  it('shows whole minutes, like the profile card’s time axis', () => {
    expect(formatZoneTime(90)).toBe('2m');
    expect(formatZoneTime(3720)).toBe('1h 2m');
  });

  it('shows seconds under a minute, so a short burst doesn’t read as none', () => {
    expect(formatZoneTime(20)).toBe('20s');
  });

  it('shows a whole minute as minutes', () => {
    expect(formatZoneTime(60)).toBe('1m');
  });
});
