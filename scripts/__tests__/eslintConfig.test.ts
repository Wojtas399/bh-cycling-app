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

const TANSTACK_READ_IMPORT = [
  "import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';",
  '',
  'export { useQueries, useQuery, useQueryClient };',
  '',
].join('\n');

const SENTRY_IMPORT = [
  "import * as Sentry from '@sentry/react-native';",
  "import type { ErrorEvent } from '@sentry/react-native';",
  '',
  'export { Sentry };',
  'export type { ErrorEvent };',
  '',
].join('\n');

async function restrictedImportsIn(source: string, filePath: string) {
  const [result] = await new ESLint({
    overrideConfigFile: true,
    baseConfig: projectConfig,
  }).lintText(source, { filePath });

  return result.messages
    .filter(({ ruleId }) => ruleId?.endsWith('no-restricted-imports'))
    .map(({ message }) => message.split(' ')[0]);
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

  it.each([
    'hooks/home/useUpcomingWorkouts.ts',
    'hooks/useFormTextField.ts',
    'app/(app)/fitness.tsx',
    'lib/intervalsQueries.ts',
  ])(
    'makes %s read Intervals.icu data through useIntervalsRead, not useQuery or useQueries',
    async filePath => {
      expect(await restrictedImportsIn(TANSTACK_READ_IMPORT, filePath)).toEqual(
        ["'useQueries'", "'useQuery'"],
      );
    },
  );

  it.each([
    'hooks/useIntervalsRead.ts',
    'hooks/calendar/useCalendarRange.ts',
    'hooks/__tests__/useRefetchQuery.test.ts',
    'test-utils/__tests__/settle.test.ts',
  ])('lets %s call useQuery and useQueries directly', async filePath => {
    expect(await restrictedImportsIn(TANSTACK_READ_IMPORT, filePath)).toEqual(
      [],
    );
  });

  it.each([
    'lib/queryClient.ts',
    'lib/sentryConfig.ts',
    'hooks/useAuthState.ts',
    'components/Tile.tsx',
    'app/_layout.tsx',
    'hooks/useFormTextField.ts',
  ])(
    'makes %s report errors through lib/errorReporting.ts, not the Sentry SDK',
    async filePath => {
      expect(await restrictedImportsIn(SENTRY_IMPORT, filePath)).toEqual([
        "'@sentry/react-native'",
        "'@sentry/react-native'",
      ]);
    },
  );

  it('lets lib/errorReporting.ts import the Sentry SDK', async () => {
    expect(
      await restrictedImportsIn(SENTRY_IMPORT, 'lib/errorReporting.ts'),
    ).toEqual([]);
  });
});
