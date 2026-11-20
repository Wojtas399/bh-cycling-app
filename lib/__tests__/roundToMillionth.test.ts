import { roundToMillionth } from '../roundToMillionth';

describe('roundToMillionth', () => {
  it('drops floating-point noise, so 5% over a 333⅓ peak is 350, not 350.00000000000006', () => {
    const peak = (340 / 102) * 100;

    expect(peak * 1.05).toBe(350.00000000000006);
    expect(roundToMillionth(peak * 1.05)).toBe(350);
  });

  it('keeps six decimal places', () => {
    expect(roundToMillionth(1.2345674)).toBe(1.234567);
  });
});
