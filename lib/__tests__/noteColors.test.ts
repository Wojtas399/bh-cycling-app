import { noteFill, noteLabelColor } from '../noteColors';
import theme from '@/constants/theme';

describe('noteLabelColor', () => {
  it.each(['#000000', '#1C1C1E', '#7A1A14', '#636366', '#0000FF'])(
    'is white on the dark fill %s',
    fill => {
      expect(noteLabelColor(fill)).toBe(theme.colors.white);
    },
  );

  it.each(['#FFFFFF', '#FFD60A', '#34C759', '#F2F2F7', '#FF9F0A'])(
    'is black on the light fill %s',
    fill => {
      expect(noteLabelColor(fill)).toBe(theme.colors.black);
    },
  );

  it('reads a short or lower-case hex', () => {
    expect(noteLabelColor('#fff')).toBe(theme.colors.black);
    expect(noteLabelColor('#00f')).toBe(theme.colors.white);
    expect(noteLabelColor('#1c1c1e')).toBe(theme.colors.white);
  });

  it('resolves no colour to the neutral fill, which takes black', () => {
    expect(noteLabelColor(null)).toBe(theme.colors.black);
    expect(noteLabelColor(theme.colors.neutral)).toBe(theme.colors.black);
  });
});

describe('noteFill', () => {
  it('keeps the Note colour', () => {
    expect(noteFill('#FF3B30')).toBe('#FF3B30');
  });

  it('falls back to neutral for no colour', () => {
    expect(noteFill(null)).toBe(theme.colors.neutral);
  });

  it('falls back to neutral for a colour that is not hex', () => {
    expect(noteFill('banana')).toBe(theme.colors.neutral);
  });
});
