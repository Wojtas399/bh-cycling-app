import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  it('formats a duration under an hour as minutes only', () => {
    expect(formatDuration(50 * 60)).toBe('50m');
  });

  it('formats an exact number of hours without minutes', () => {
    expect(formatDuration(2 * 60 * 60)).toBe('2h');
  });

  it('formats hours and minutes together', () => {
    expect(formatDuration(60 * 60 + 50 * 60)).toBe('1h 50m');
  });

  it('formats zero as 0m', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('rounds to the nearest minute', () => {
    expect(formatDuration(50 * 60 + 29)).toBe('50m');
    expect(formatDuration(50 * 60 + 31)).toBe('51m');
  });

  it('treats negative and non-finite inputs as zero', () => {
    expect(formatDuration(-100)).toBe('0m');
    expect(formatDuration(Number.NaN)).toBe('0m');
  });
});
