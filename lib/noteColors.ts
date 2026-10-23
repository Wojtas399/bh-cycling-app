import theme from '@/constants/theme';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * What a Note is filled with: its intervals.icu colour, or the theme's
 * `neutral` gray when it has none (or one that isn't a `#rgb`/`#rrggbb` hex).
 * Shared by the month grid and the week view.
 */
export function noteFill(color: string | null): string {
  return color && HEX_COLOR.test(color) ? color : theme.colors.neutral;
}

/** WCAG relative luminance of a `#rgb`/`#rrggbb` colour. */
function luminance(hex: string): number {
  const digits =
    hex.length === 4
      ? [...hex.slice(1)].map(digit => digit + digit)
      : [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)];
  const [r, g, b] = digits.map(pair => {
    const channel = parseInt(pair, 16) / 255;

    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (light + 0.05) / (dark + 0.05);
}

/**
 * The text colour for a label on a Note's fill: the theme's black or white,
 * whichever has the higher WCAG contrast against it. `null` resolves to the
 * `neutral` fallback, as in `noteFill`.
 */
export function noteLabelColor(fill: string | null): string {
  const background = noteFill(fill);
  const { black, white } = theme.colors;

  return contrast(background, black) >= contrast(background, white)
    ? black
    : white;
}
