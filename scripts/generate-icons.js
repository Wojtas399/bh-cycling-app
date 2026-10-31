const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const Jimp = require('jimp-compact');

const ROOT = path.resolve(__dirname, '..');
const CANVAS_SIZE = 1024;
const FEATURE_WIDTH = 1024;
const FEATURE_HEIGHT = 500;
const NEAR_BLACK = '#0A0A0A';
const YELLOW = '#FFD60A';
const NEAR_BLACK_SRGB = 'srgb:0.03922,0.03922,0.03922,1.00000';
const ANDROID_SAFE_ZONE_SCALE = 72 / 108;
const PNG_COLOR_TYPE_RGB = 2;
const RIBBON_LENGTH = 2.4;
const VARIANTS = ['production', 'staging'];

const master = fs.readFileSync(
  path.join(ROOT, 'assets/icon-source/horse-mark.svg'),
  'utf8',
);
const mark = master.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '');
const label = fs
  .readFileSync(path.join(ROOT, 'assets/icon-source/stg-label.svg'), 'utf8')
  .replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')
  .replace(/<defs\/>/g, '');

const canvas = contents =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">${contents}</svg>`;

const onNearBlack = contents =>
  `<rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="${NEAR_BLACK}"/>${contents}`;

const inAndroidSafeZone = contents => {
  const center = CANVAS_SIZE / 2;

  return `<g transform="translate(${center} ${center}) scale(${ANDROID_SAFE_ZONE_SCALE}) translate(-${center} -${center})">${contents}</g>`;
};

// Long enough to pass every edge even after the Android layer scales it down.
const diagonalStrip = (fill, y, height) =>
  `<g transform="scale(${CANVAS_SIZE})"><rect transform="rotate(-45 .78 .78)" x="${0.8 - RIBBON_LENGTH / 2}" y="${y}" width="${RIBBON_LENGTH}" height="${height}" fill="${fill}"/></g>`;

const gap = fill => diagonalStrip(fill, 0.665, 0.23);
const ribbon = fill => diagonalStrip(fill, 0.69, 0.18);

const withCutOut = (id, contents, cutOut) =>
  `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"><rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#fff"/>${cutOut}</mask></defs><g mask="url(#${id})">${contents}</g>`;

const markClearOfRibbon = withCutOut('g', mark, gap('#000'));

const TILE = {
  production: mark,
  staging:
    mark +
    gap(NEAR_BLACK) +
    ribbon(YELLOW) +
    label.replace(/fill="#000"/g, `fill="${NEAR_BLACK}"`),
};

// Themed icons drop colour, so staging has to differ by shape alone. The ribbon
// mask sits outside the safe-zone scale: inside it, the mask region would crop
// the ribbon at the safe zone instead of letting it bleed.
const ANDROID_SILHOUETTE = {
  production: inAndroidSafeZone(mark),
  staging:
    inAndroidSafeZone(markClearOfRibbon) +
    withCutOut(
      't',
      inAndroidSafeZone(ribbon('#FFF')),
      inAndroidSafeZone(label),
    ),
};

const PNG_OUTPUTS = [
  ...VARIANTS.flatMap(variant => [
    {
      path: `assets/images/icon-${variant}.png`,
      svg: canvas(onNearBlack(TILE[variant])),
      width: 1024,
      opaque: true,
    },
    {
      path: `assets/images/android-foreground-${variant}.png`,
      svg: canvas(inAndroidSafeZone(TILE[variant])),
      width: 1024,
      opaque: false,
    },
    {
      path: `assets/images/android-monochrome-${variant}.png`,
      svg: canvas(ANDROID_SILHOUETTE[variant]),
      width: 1024,
      opaque: false,
    },
    {
      path: `assets/store/play-icon-${variant}.png`,
      svg: canvas(onNearBlack(TILE[variant])),
      width: 512,
      opaque: true,
    },
  ]),
  {
    path: 'assets/images/splash-icon.png',
    svg: master,
    width: 1024,
    opaque: false,
  },
  {
    path: 'assets/images/horse-mark.png',
    svg: master,
    width: 408,
    opaque: false,
  },
  {
    path: 'assets/images/favicon.png',
    svg: canvas(onNearBlack(mark)),
    width: 48,
    opaque: true,
  },
  {
    path: 'assets/store/feature-graphic.png',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FEATURE_WIDTH} ${FEATURE_HEIGHT}"><rect width="${FEATURE_WIDTH}" height="${FEATURE_HEIGHT}" fill="${NEAR_BLACK}"/><svg x="${(FEATURE_WIDTH - FEATURE_HEIGHT) / 2}" y="0" width="${FEATURE_HEIGHT}" height="${FEATURE_HEIGHT}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">${mark}</svg></svg>`,
    width: FEATURE_WIDTH,
    opaque: true,
  },
];

const ICON_DOCUMENTS = [
  {
    path: 'assets/icons/AppIcon-production.icon',
    assets: { 'mark.svg': master },
    layers: ['mark'],
  },
  {
    path: 'assets/icons/AppIcon-staging.icon',
    assets: {
      'mark.svg': canvas(markClearOfRibbon),
      'ribbon.svg': canvas(withCutOut('t', ribbon(YELLOW), label)),
    },
    layers: ['ribbon', 'mark'],
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
