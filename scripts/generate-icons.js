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
const CYAN = '#64D2FF';
const NEAR_BLACK_SRGB = 'srgb:0.03922,0.03922,0.03922,1.00000';
const ANDROID_SAFE_ZONE_SCALE = 72 / 108;
const PNG_COLOR_TYPE_RGB = 2;
const RIBBON_LENGTH = 2.4;
const RIBBON_CENTER_X = 0.8;
// Text, because the .icon SVGs commit this spelling byte for byte.
const RIBBON_PIVOT = '.78';
const GAP_STRIP = { y: 0.665, height: 0.23 };
const RIBBON_STRIP = { y: 0.69, height: 0.18 };
const GAP_MASK_ID = 'g';
const LABEL_MASK_ID = 't';
const VARIANTS = ['production', 'staging', 'dev'];
// The Dev build is internal distribution only, so it has no Play listing.
const STORE_VARIANTS = ['production', 'staging'];

const stripOuterSvg = svg =>
  svg.replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '');

const master = fs.readFileSync(
  path.join(ROOT, 'assets/icon-source/horse-mark.svg'),
  'utf8',
);
const mark = stripOuterSvg(master);
const readLabel = file =>
  stripOuterSvg(
    fs.readFileSync(path.join(ROOT, `assets/icon-source/${file}`), 'utf8'),
  ).replace(/<defs\/>/g, '');

// Non-production variants carry a corner ribbon. Dev differs from staging by
// colour as well as by label, so the two read apart at home-screen size.
const RIBBONS = {
  staging: { label: readLabel('stg-label.svg'), fill: YELLOW },
  dev: { label: readLabel('dev-label.svg'), fill: CYAN },
};

const canvas = contents =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">${contents}</svg>`;

const nearBlackRect = (width, height) =>
  `<rect width="${width}" height="${height}" fill="${NEAR_BLACK}"/>`;

const onNearBlack = contents =>
  nearBlackRect(CANVAS_SIZE, CANVAS_SIZE) + contents;

const inAndroidSafeZone = contents => {
  const center = CANVAS_SIZE / 2;

  return `<g transform="translate(${center} ${center}) scale(${ANDROID_SAFE_ZONE_SCALE}) translate(-${center} -${center})">${contents}</g>`;
};

// Long enough to pass every edge even after the Android layer scales it down.
const diagonalStrip = (fill, { y, height }) =>
  `<g transform="scale(${CANVAS_SIZE})"><rect transform="rotate(-45 ${RIBBON_PIVOT} ${RIBBON_PIVOT})" x="${RIBBON_CENTER_X - RIBBON_LENGTH / 2}" y="${y}" width="${RIBBON_LENGTH}" height="${height}" fill="${fill}"/></g>`;

const gap = fill => diagonalStrip(fill, GAP_STRIP);
const ribbon = fill => diagonalStrip(fill, RIBBON_STRIP);

const withCutOut = (id, contents, cutOut) =>
  `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"><rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#fff"/>${cutOut}</mask></defs><g mask="url(#${id})">${contents}</g>`;

const markClearOfRibbon = withCutOut(GAP_MASK_ID, mark, gap('#000'));

const ribbonedTile = ({ label, fill }) =>
  mark +
  gap(NEAR_BLACK) +
  ribbon(fill) +
  label.replace(/fill="#000"/g, `fill="${NEAR_BLACK}"`);

// Themed icons drop colour, so a ribboned variant has to differ by shape. The
// ribbon mask sits outside the safe-zone scale: inside it, the mask region
// would crop the ribbon at the safe zone instead of letting it bleed.
const ribbonedSilhouette = ({ label }) =>
  inAndroidSafeZone(markClearOfRibbon) +
  withCutOut(
    LABEL_MASK_ID,
    inAndroidSafeZone(ribbon('#FFF')),
    inAndroidSafeZone(label),
  );

const TILE = {
  production: mark,
  staging: ribbonedTile(RIBBONS.staging),
  dev: ribbonedTile(RIBBONS.dev),
};

const ANDROID_SILHOUETTE = {
  production: inAndroidSafeZone(mark),
  staging: ribbonedSilhouette(RIBBONS.staging),
  dev: ribbonedSilhouette(RIBBONS.dev),
};

const opaqueTile = variant => canvas(onNearBlack(TILE[variant]));

const PNG_OUTPUTS = [
  ...VARIANTS.flatMap(variant => [
    {
      path: `assets/images/icon-${variant}.png`,
      svg: opaqueTile(variant),
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
  ]),
  ...STORE_VARIANTS.map(variant => ({
    path: `assets/store/play-icon-${variant}.png`,
    svg: opaqueTile(variant),
    width: 512,
    opaque: true,
  })),
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
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FEATURE_WIDTH} ${FEATURE_HEIGHT}">${nearBlackRect(FEATURE_WIDTH, FEATURE_HEIGHT)}<svg x="${(FEATURE_WIDTH - FEATURE_HEIGHT) / 2}" y="0" width="${FEATURE_HEIGHT}" height="${FEATURE_HEIGHT}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">${mark}</svg></svg>`,
    width: FEATURE_WIDTH,
    opaque: true,
  },
];

const ribbonedIconContents = ({ label, fill }) => ({
  assets: {
    'mark.svg': canvas(markClearOfRibbon),
    'ribbon.svg': canvas(withCutOut(LABEL_MASK_ID, ribbon(fill), label)),
  },
  layers: ['ribbon', 'mark'],
});

const ICON_CONTENTS = {
  production: {
    assets: { 'mark.svg': master },
    layers: ['mark'],
  },
  staging: ribbonedIconContents(RIBBONS.staging),
  dev: ribbonedIconContents(RIBBONS.dev),
};

const ICON_DOCUMENTS = VARIANTS.map(variant => ({
  path: `assets/icons/AppIcon-${variant}.icon`,
  ...ICON_CONTENTS[variant],
}));

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
