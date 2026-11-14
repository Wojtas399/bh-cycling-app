import { formatDuration, formatSpokenDuration } from '../formatDuration';

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

describe('formatSpokenDuration', () => {
  const WORDS = {
    hours: (hours: number) => `${hours} godz.`,
    minutes: (minutes: number) => `${minutes} min`,
  };

  it('says a duration under an hour in minutes only', () => {
    expect(formatSpokenDuration(45 * 60, WORDS)).toBe('45 min');
  });

  it('says an exact number of hours without minutes', () => {
    expect(formatSpokenDuration(60 * 60, WORDS)).toBe('1 godz.');
  });

  it('says hours and then minutes', () => {
    expect(formatSpokenDuration(3 * 60 * 60 + 2 * 60, WORDS)).toBe(
      '3 godz. 2 min',
    );
  });

  it('rounds to the nearest minute, as formatDuration does', () => {
    expect(formatSpokenDuration(60 * 60 + 15 * 60 + 31, WORDS)).toBe(
      '1 godz. 16 min',
    );
    expect(formatSpokenDuration(59 * 60 + 45, WORDS)).toBe('1 godz.');
  });

  it('treats negative and non-finite inputs as zero', () => {
    expect(formatSpokenDuration(-100, WORDS)).toBe('0 min');
    expect(formatSpokenDuration(Number.NaN, WORDS)).toBe('0 min');
  });
});
