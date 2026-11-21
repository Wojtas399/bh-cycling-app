import { buildStamp, isBundleInput } from '../buildStamp';

const app = [
  { path: 'app/index.tsx', content: 'export default 1;' },
  { path: 'lib/route.ts', content: 'export const a = 1;' },
];

describe('buildStamp', () => {
  it('changes when bundled app code changes', () => {
    const edited = [
      app[0],
      { path: 'lib/route.ts', content: 'export const a = 2;' },
    ];

    expect(buildStamp(edited)).not.toBe(buildStamp(app));
  });

  it('changes when a bundled file is added', () => {
    expect(
      buildStamp([...app, { path: 'components/Tile.tsx', content: '' }]),
    ).not.toBe(buildStamp(app));
  });

  it('ignores the order files are listed in', () => {
    expect(buildStamp([...app].reverse())).toBe(buildStamp(app));
  });

  it.each([
    'e2e/tests/sign-in.e2e.ts',
    'e2e/support/locators.ts',
    'lib/__tests__/route.test.ts',
    'docs/e2e.md',
    'CONTEXT.md',
    'scripts/e2e-build.sh',
    'functions/src/index.ts',
    'test-utils/settle.ts',
  ])('needs no rebuild when only %s changes', path => {
    expect(buildStamp([...app, { path, content: 'changed' }])).toBe(
      buildStamp(app),
    );
  });
});

describe('isBundleInput', () => {
  it.each([
    'app.config.ts',
    'package-lock.json',
    'assets/icon.png',
    'i18n/pl.json',
  ])('counts %s as bundled', path => {
    expect(isBundleInput(path)).toBe(true);
  });
});
