import { formatPower } from '../formatPower';

describe('formatPower', () => {
  it.each([
    ['watts', 249.6, undefined, '250 W'],
    ['ftpPct', 88.4, undefined, '88%'],
    ['watts', 220, 232.5, '220–233 W'],
    ['ftpPct', 88, 93, '88–93%'],
    ['ftpPct', 99.6, 100.4, '100%'],
  ] as const)('reads %s %d–%s as %s', (unit, low, high, expected) => {
    expect(formatPower(unit, low, high)).toBe(expected);
  });
});
