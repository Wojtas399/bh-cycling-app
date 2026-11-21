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
const RIBBON_LENGTH_PAST_SCALED_EDGES = 2.4;
const RIBBON_CENTER_X = 0.8;
const RIBBON_PIVOT_AS_COMMITTED_SVG_TEXT = '.78';
const GAP_STRIP = { y: 0.665, height: 0.23 };
const RIBBON_STRIP = { y: 0.69, height: 0.18 };
const GAP_MASK_ID = 'g';
const LABEL_MASK_ID = 't';
const VARIANTS = ['production', 'staging', 'dev'];
const INTERNAL_DISTRIBUTION_ONLY_VARIANTS = ['dev'];
const PLAY_LISTED_VARIANTS = VARIANTS.filter(
  variant => !INTERNAL_DISTRIBUTION_ONLY_VARIANTS.includes(variant),
);

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

const CORNER_RIBBONS = {
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

const diagonalStrip = (fill, { y, height }) =>
  `<g transform="scale(${CANVAS_SIZE})"><rect transform="rotate(-45 ${RIBBON_PIVOT_AS_COMMITTED_SVG_TEXT} ${RIBBON_PIVOT_AS_COMMITTED_SVG_TEXT})" x="${RIBBON_CENTER_X - RIBBON_LENGTH_PAST_SCALED_EDGES / 2}" y="${y}" width="${RIBBON_LENGTH_PAST_SCALED_EDGES}" height="${height}" fill="${fill}"/></g>`;

const gap = fill => diagonalStrip(fill, GAP_STRIP);
const ribbon = fill => diagonalStrip(fill, RIBBON_STRIP);

const withCutOut = (id, contents, cutOut) =>
  `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"><rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#fff"/>${cutOut}</mask></defs><g mask="url(#${id})">${contents}</g>`;

const withCutOutBleedingPastSafeZone = (id, contents, cutOut) =>
  withCutOut(id, inAndroidSafeZone(contents), inAndroidSafeZone(cutOut));

const markClearOfRibbon = withCutOut(GAP_MASK_ID, mark, gap('#000'));

const ribbonedTile = ({ label, fill }) =>
  mark +
  gap(NEAR_BLACK) +
  ribbon(fill) +
  label.replace(/fill="#000"/g, `fill="${NEAR_BLACK}"`);

const ribbonedSilhouetteWithLabelCutOut = ({ label }) =>
  inAndroidSafeZone(markClearOfRibbon) +
  withCutOutBleedingPastSafeZone(LABEL_MASK_ID, ribbon('#FFF'), label);

const mapRibbons = f =>
  Object.fromEntries(
    Object.entries(CORNER_RIBBONS).map(([variant, spec]) => [variant, f(spec)]),
  );

const TILE = {
  production: mark,
  ...mapRibbons(ribbonedTile),
};

const ANDROID_SILHOUETTE = {
  production: inAndroidSafeZone(mark),
  ...mapRibbons(ribbonedSilhouetteWithLabelCutOut),
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
  ...PLAY_LISTED_VARIANTS.map(variant => ({
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
  ...mapRibbons(ribbonedIconContents),
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

const reencodeAsRgbPng = async png => {
  const image = await Jimp.read(png);

  image.colorType(PNG_COLOR_TYPE_RGB);

  return image.getBufferAsync('image/png');
};

const renderPng = async ({ svg, width, opaque }) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();

  return opaque ? reencodeAsRgbPng(png) : png;
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

if (require.main === module) {
  generate();
}

module.exports = { renderPng };
