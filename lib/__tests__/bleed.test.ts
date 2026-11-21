import { bleedHitArea, bleedPastVerticalPadding } from '@/lib/bleed';

describe('bleedPastVerticalPadding', () => {
  it('runs past the parent’s vertical padding to its edges', () => {
    expect(bleedPastVerticalPadding(12)).toEqual({ marginVertical: -12 });
  });
});

describe('bleedHitArea', () => {
  it('stretches a hit area over the parent’s vertical padding while its content stays inside it', () => {
    expect(bleedHitArea(12)).toEqual({
      marginVertical: -12,
      paddingVertical: 12,
    });
  });
});
