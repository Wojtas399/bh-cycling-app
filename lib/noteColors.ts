import type { HexColorString } from './intervalsApi';
import theme from '@/constants/theme';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function noteFill(color: HexColorString | null): HexColorString {
  return color && HEX_COLOR.test(color) ? color : theme.colors.neutral;
}

function wcagRelativeLuminance(hex: HexColorString): number {
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

function wcagContrastRatio(a: HexColorString, b: HexColorString): number {
  const [light, dark] = [
    wcagRelativeLuminance(a),
    wcagRelativeLuminance(b),
  ].sort((x, y) => y - x);

  return (light + 0.05) / (dark + 0.05);
}

export function noteLabelColor(fill: HexColorString | null): HexColorString {
  const background = noteFill(fill);
  const { black, white } = theme.colors;

  return wcagContrastRatio(background, black) >=
    wcagContrastRatio(background, white)
    ? black
    : white;
}
