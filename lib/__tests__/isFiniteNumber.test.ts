import { isFiniteNumber } from '../isFiniteNumber';

describe('isFiniteNumber', () => {
  it('accepts finite numbers, zero and negatives included', () => {
    expect(isFiniteNumber(42)).toBe(true);
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-3.5)).toBe(true);
  });

  it('rejects what intervals.icu sends for a missing metric', () => {
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber(undefined)).toBe(false);
  });

  it('rejects NaN, infinities and non-numbers', () => {
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber('42')).toBe(false);
  });
});
