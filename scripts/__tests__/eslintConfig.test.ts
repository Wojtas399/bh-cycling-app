import projectConfig from '../../eslint.config';
import { ESLint } from 'eslint';

const LINTED_FILE_KINDS = [
  'lib/route.ts',
  'components/Tile.tsx',
  'app/(app)/index.tsx',
  'e2e/support/locators.ts',
  'scripts/generate-icons.js',
  'eslint.config.js',
];

const PROJECT_BANS = ['no-restricted-syntax', 'no-empty'];

async function rulesFor(filePath: string) {
  const config = await new ESLint({
    overrideConfigFile: true,
    baseConfig: projectConfig,
  }).calculateConfigForFile(filePath);

  return Object.fromEntries(
    PROJECT_BANS.map(rule => [rule, config.rules?.[rule]]),
  );
}

describe('eslint.config.js', () => {
  it.each(LINTED_FILE_KINDS)(
    'applies every project ban to %s as it does to lib/ TypeScript',
    async filePath => {
      const reference = await rulesFor('lib/route.ts');

      expect(reference['no-restricted-syntax']).toBeDefined();
      expect(await rulesFor(filePath)).toEqual(reference);
    },
  );
});
