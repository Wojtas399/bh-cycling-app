import projectConfig from '../../eslint.config';
import { ESLint } from 'eslint';

async function formatted(source: string, filePath: string) {
  const [result] = await new ESLint({
    overrideConfigFile: true,
    baseConfig: projectConfig,
    fix: true,
  }).lintText(source, { filePath });

  return result.output ?? source;
}

describe('.prettierrc', () => {
  it('sorts the Intervals connection fake above the hook under test, so its jest.mock calls run before the hook loads the real connection', async () => {
    const source = [
      "import { useNextRace } from '@/hooks/home/useNextRace';",
      "import { connectIntervals } from '@/test-utils/intervalsConnection';",
      '',
      'export { connectIntervals, useNextRace };',
      '',
    ].join('\n');

    expect(
      await formatted(source, 'hooks/home/__tests__/useNextRace.test.ts'),
    ).toBe(
      [
        "import { connectIntervals } from '@/test-utils/intervalsConnection';",
        '',
        "import { useNextRace } from '@/hooks/home/useNextRace';",
        '',
        'export { connectIntervals, useNextRace };',
        '',
      ].join('\n'),
    );
  });
});
