import { buildStamp } from './support/buildStamp.ts';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLATFORMS = ['ios', 'android'];
const USAGE =
  'Usage: e2e/buildStamp.ts print | write ios|android [stamp] | check ios|android';

function currentStamp(): string {
  const paths = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: ROOT, encoding: 'utf8' },
  )
    .split('\0')
    .filter(path => path && existsSync(`${ROOT}${path}`));

  return buildStamp(
    paths.map(path => ({
      path,
      content: readFileSync(`${ROOT}${path}`, 'latin1'),
    })),
  );
}

function stampFile(platform: string): string {
  if (!PLATFORMS.includes(platform)) {
    throw new Error(USAGE);
  }

  return `${ROOT}.e2e/build-stamp-${platform}.txt`;
}

const [command, platform = '', pending] = process.argv.slice(2);

if (command === 'print') {
  process.stdout.write(`${currentStamp()}\n`);
} else if (command === 'write') {
  mkdirSync(`${ROOT}.e2e`, { recursive: true });
  writeFileSync(stampFile(platform), `${pending ?? currentStamp()}\n`);
} else if (command === 'check') {
  const file = stampFile(platform);
  const built = existsSync(file) ? readFileSync(file, 'utf8').trim() : null;

  if (built !== currentStamp()) {
    console.error(
      built === null
        ? `E2E build check failed: no stamp for the ${platform} build. Run npm run e2e:build:${platform} first.`
        : `E2E build check failed: app code changed since the last ${platform} build, which bundles its JS. Run npm run e2e:build:${platform} first.`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `E2E build check: the ${platform} build matches the app code.\n`,
    );
  }
} else {
  throw new Error(USAGE);
}
