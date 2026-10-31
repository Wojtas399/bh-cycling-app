const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const Jimp = require('jimp-compact');

const ROOT = path.resolve(__dirname, '..');
const CANVAS_SIZE = 1024;
const NEAR_BLACK = '#0A0A0A';
const NEAR_BLACK_SRGB = 'srgb:0.03922,0.03922,0.03922,1.00000';
const ANDROID_SAFE_ZONE_SCALE = 72 / 108;
const PNG_COLOR_TYPE_RGB = 2;

const master = fs.readFileSync(
  path.join(ROOT, 'assets/icon-source/horse-mark.svg'),
  'utf8',
);
const mark = master.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '');

const canvas = contents =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">${contents}</svg>`;

const onNearBlack = contents =>
  `<rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="${NEAR_BLACK}"/>${contents}`;

const inAndroidSafeZone = contents => {
  const center = CANVAS_SIZE / 2;

  return `<g transform="translate(${center} ${center}) scale(${ANDROID_SAFE_ZONE_SCALE}) translate(-${center} -${center})">${contents}</g>`;
};

const PNG_OUTPUTS = [
  {
    path: 'assets/images/icon-production.png',
    svg: canvas(onNearBlack(mark)),
    width: 1024,
    opaque: true,
  },
  {
    path: 'assets/images/android-foreground-production.png',
    svg: canvas(inAndroidSafeZone(mark)),
    width: 1024,
    opaque: false,
  },
  {
    path: 'assets/images/android-monochrome-production.png',
    svg: canvas(inAndroidSafeZone(mark)),
    width: 1024,
    opaque: false,
  },
];

const ICON_DOCUMENTS = [
  {
    path: 'assets/icons/AppIcon-production.icon',
    assets: { 'mark.svg': master },
    layers: ['mark'],
  },
];

const iconJson = layers => ({
  fill: { solid: NEAR_BLACK_SRGB },
  groups: [
    {
      shadow: { kind: 'neutral', opacity: 0.5 },
      translucency: { enabled: false, value: 0.5 },
      specular: false,
      layers: layers.map(name => ({
        name,
        'image-name': `${name}.svg`,
        glass: false,
      })),
    },
  ],
  'supported-platforms': { squares: 'shared' },
});

const writeOutput = (relativePath, contents) => {
  const target = path.join(ROOT, relativePath);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
};

const renderPng = async ({ svg, width, opaque }) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();

  if (!opaque) {
    return png;
  }

  // rgba(false) writes an RGB header over RGBA data. sips accepts that PNG, but
  // it decodes as garbage.
  const image = await Jimp.read(png);

  image.colorType(PNG_COLOR_TYPE_RGB);

  return image.getBufferAsync('image/png');
};

const generate = async () => {
  for (const output of PNG_OUTPUTS) {
    writeOutput(output.path, await renderPng(output));
  }

  for (const icon of ICON_DOCUMENTS) {
    for (const [name, contents] of Object.entries(icon.assets)) {
      writeOutput(`${icon.path}/Assets/${name}`, contents);
    }

    writeOutput(
      `${icon.path}/icon.json`,
      `${JSON.stringify(iconJson(icon.layers), null, 2)}\n`,
    );
  }
};

generate();
