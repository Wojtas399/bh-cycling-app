import { filesToCheck, findBannedComments } from '../check-no-comments';

function bannedIn(text: string, fileName = 'file.tsx') {
  return findBannedComments(fileName, text).map(comment => comment.text);
}

describe('findBannedComments', () => {
  it('allows eslint-disable-next-line with a rule and a reason', () => {
    expect(
      bannedIn(
        '// eslint-disable-next-line import/no-named-as-default-member -- i18next documents use on the default instance\ni18n.use(x);\n',
      ),
    ).toEqual([]);
  });

  it('allows eslint-disable-line with a rule and a reason after the code', () => {
    expect(
      bannedIn(
        'i18n.use(x); // eslint-disable-line import/no-named-as-default-member -- documented usage\n',
      ),
    ).toEqual([]);
  });

  it('allows one directive to name several rules', () => {
    expect(
      bannedIn(
        '// eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any -- the fixture logs untyped input\nconsole.log(x as any);\n',
      ),
    ).toEqual([]);
  });

  it.each([
    '// eslint-disable-next-line react/no-array-index-key --',
    '// eslint-disable-next-line -- index keys are stable here',
    '// eslint-disable-next-line',
    '// eslint-disable react/no-array-index-key -- index keys are stable here',
    '// eslint-disable',
    '/* eslint-disable */',
    '/* eslint-disable react/no-array-index-key -- index keys are stable here */',
    '/* eslint-disable-next-line react/no-array-index-key -- index keys are stable here */',
    '// eslint-enable react/no-array-index-key',
    '/* eslint-enable */',
    '// note: eslint-disable-next-line no-console -- logs on purpose',
  ])('rejects %j, which is not an allowed disable shape', directive => {
    expect(bannedIn(`${directive}\nf();\n`)).toEqual([directive]);
  });

  it('rejects a reasoned disable of consistent-type-assertions', () => {
    const directive =
      '// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the SDK types are wrong';

    expect(bannedIn(`${directive}\nconst a = b as C;\n`)).toEqual([directive]);
  });

  it('rejects consistent-type-assertions named among other rules', () => {
    const directive =
      '// eslint-disable-next-line no-console, @typescript-eslint/consistent-type-assertions -- the fixture logs a cast';

    expect(bannedIn(`${directive}\nconsole.log(b as C);\n`)).toEqual([
      directive,
    ]);
  });

  it('rejects an eslint-disable-line of consistent-type-assertions after the code', () => {
    const directive =
      '// eslint-disable-line @typescript-eslint/consistent-type-assertions -- the SDK types are wrong';

    expect(bannedIn(`const a = b as C; ${directive}\n`)).toEqual([directive]);
  });

  it('rejects eslint-disable-next-line without a reason', () => {
    expect(
      bannedIn('// eslint-disable-next-line react/no-array-index-key\nf();\n'),
    ).toEqual(['// eslint-disable-next-line react/no-array-index-key']);
  });

  it('allows @ts-expect-error with a colon and a reason', () => {
    expect(
      bannedIn('// @ts-expect-error: the SDK types omit this field\nf();\n'),
    ).toEqual([]);
  });

  it.each([
    '// @ts-expect-error',
    '// @ts-expect-error:',
    '// @ts-expect-error the SDK types omit this field',
  ])('rejects %j, which lacks the ": <reason>" shape', directive => {
    expect(bannedIn(`${directive}\nf();\n`)).toEqual([directive]);
  });

  it.each([
    '// @ts-ignore: the SDK types omit this field',
    '// @ts-nocheck',
    '// @ts-check',
    '/// <reference types="node" />',
    '/** @jest-environment jsdom */',
    '// prettier-ignore',
    '/* istanbul ignore next */',
    '/* global __DEV__ */',
    '/* eslint no-console: "off" */',
    '/** Returns the planned duration in seconds. */',
    '// TODO: move this into lib/',
    '// See https://github.com/Wojtas399/bh-cycling-app/issues/1',
    '// f(previousValue);',
  ])('rejects %j', comment => {
    expect(bannedIn(`${comment}\nf();\n`)).toEqual([comment]);
  });

  it('finds exactly the real comments in the adversarial fixture, with their lines', () => {
    const fixture = [
      'const url = "https://example.com/a";',
      'const quoted = "a // b";',
      'const template = `x // ${a} /* y */`;',
      'const regex = /a\\/*b/;',
      'const glob = "src/**/*.ts";',
      'const joined = parts.join("//");',
      'const product = 6 /* six */ * 7;',
      'const multiline = `',
      '  // inside a template',
      '`;',
      'const k = 1; // trailing',
      '/*',
      ' * multi-line',
      ' */',
      'const i = 2 *',
      '  k;',
      '// @ts-expect-error: the fixture calls an undeclared function',
      'undeclared();',
      '// eslint-disable-next-line no-console -- the fixture logs on purpose',
      'console.log(k);',
      'export function Edge() {',
      '  return (',
      '    <div title="a // b">',
      '      http://example.com // and /* this */ is text',
      '      {/* real */}',
      '      <p>{a}</p>{/* trailing jsx */}',
      '      {`${a} // in a JSX template`}',
      '      <p>// JSX text that starts like a comment</p>',
      '      <p>/* and JSX text like a block */</p>',
      '    </div>',
      '  );',
      '}',
      '// last line',
    ].join('\n');

    expect(findBannedComments('edge.tsx', fixture)).toEqual([
      { line: 7, text: '/* six */' },
      { line: 11, text: '// trailing' },
      { line: 12, text: '/*\n * multi-line\n */' },
      { line: 25, text: '/* real */' },
      { line: 26, text: '/* trailing jsx */' },
      { line: 33, text: '// last line' },
    ]);
  });

  it('finds a comment on the first line of a file', () => {
    expect(
      bannedIn('// opening banner\nexport const a = 1;\n', 'a.ts'),
    ).toEqual(['// opening banner']);
  });

  it('finds a JSDoc block after the last statement of a file', () => {
    expect(bannedIn('export const a = 1;\n/** dangling */\n', 'a.ts')).toEqual([
      '/** dangling */',
    ]);
  });

  it('finds a JSDoc block in a file with no statements', () => {
    expect(bannedIn('/** alone */\n', 'a.ts')).toEqual(['/** alone */']);
  });

  it('finds comments in type positions', () => {
    expect(
      bannedIn(
        'type Step = {\n  power: number; // watts\n  /** seconds */\n  duration: number;\n};\n',
        'step.ts',
      ),
    ).toEqual(['// watts', '/** seconds */']);
  });
});

describe('filesToCheck', () => {
  const tracked = [
    'lib/notes.ts',
    'lib/__tests__/notes.test.ts',
    'lib/locales.json',
    'library/x.ts',
    'hooks/useToday.ts',
    'components/Card.tsx',
    'e2e/tests/sign-in.e2e.ts',
    'functions/src/index.ts',
    'functions/src/account/__tests__/deleteAccount.test.ts',
    'functions/test-utils/callableRequest.ts',
    'functions/jest.config.js',
    'functions/package.json',
    'app.config.ts',
    'eslint.config.js',
    'scripts/generate-icons.js',
    'scripts/check-no-effects.sh',
    'dist/bundle.js',
    'expo-env.d.ts',
    'README.md',
  ];

  it('checks every tracked TS and JS file in root, functions/src and functions/test-utils, tests included', () => {
    expect(filesToCheck(tracked)).toEqual([
      'lib/notes.ts',
      'lib/__tests__/notes.test.ts',
      'library/x.ts',
      'hooks/useToday.ts',
      'components/Card.tsx',
      'e2e/tests/sign-in.e2e.ts',
      'functions/src/index.ts',
      'functions/src/account/__tests__/deleteAccount.test.ts',
      'functions/test-utils/callableRequest.ts',
      'scripts/generate-icons.js',
    ]);
  });

  it('never checks config files or excluded generated paths', () => {
    expect(
      filesToCheck([
        'functions/jest.config.js',
        'app.config.ts',
        'eslint.config.js',
        'dist/bundle.js',
        'expo-env.d.ts',
      ]),
    ).toEqual([]);
  });
});
