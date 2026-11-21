import { renderPng } from '../generate-icons';
// @ts-expect-error: jimp-compact ships no type declarations
import Jimp from 'jimp-compact';

const PNG_COLOR_TYPE_OFFSET = 25;
const PNG_COLOR_TYPE_RGB = 2;
const PNG_COLOR_TYPE_RGBA = 6;
const NEAR_BLACK_SQUARE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="#0A0A0A"/></svg>';

describe('renderPng', () => {
  it('writes an opaque icon as an RGB PNG whose pixels decode as drawn', async () => {
    const png = await renderPng({
      svg: NEAR_BLACK_SQUARE,
      width: 4,
      opaque: true,
    });
    const decoded = await Jimp.read(png);

    expect(png[PNG_COLOR_TYPE_OFFSET]).toBe(PNG_COLOR_TYPE_RGB);
    expect(Jimp.intToRGBA(decoded.getPixelColor(1, 1))).toEqual({
      r: 0x0a,
      g: 0x0a,
      b: 0x0a,
      a: 0xff,
    });
  });

  it('keeps the alpha channel of a transparent icon', async () => {
    const png = await renderPng({
      svg: NEAR_BLACK_SQUARE,
      width: 4,
      opaque: false,
    });

    expect(png[PNG_COLOR_TYPE_OFFSET]).toBe(PNG_COLOR_TYPE_RGBA);
  });
});
