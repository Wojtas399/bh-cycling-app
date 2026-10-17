import { formatStepDuration } from '../formatStepDuration';

describe('formatStepDuration', () => {
  it('reads whole minutes and hours like formatDuration', () => {
    expect(formatStepDuration(600)).toBe('10m');
    expect(formatStepDuration(3600)).toBe('1h');
    expect(formatStepDuration(4500)).toBe('1h 15m');
  });

  it('keeps the seconds of a step that is not a whole minute', () => {
    expect(formatStepDuration(30)).toBe('30s');
    expect(formatStepDuration(90)).toBe('1m 30s');
    expect(formatStepDuration(3630)).toBe('1h 0m 30s');
  });

  it('treats negative or non-finite input as zero', () => {
    expect(formatStepDuration(-5)).toBe('0m');
    expect(formatStepDuration(Number.NaN)).toBe('0m');
  });
});
