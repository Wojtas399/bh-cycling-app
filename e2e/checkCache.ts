/**
 * Fails when a file in the committed replay cache, `.e2e/cache`, holds the
 * test users' emails or passwords or the Intervals.icu key, so a recording
 * can't leak one into git. `npm run e2e:ios` and `npm run e2e:android` run it
 * before the seed. `findCacheLeaks` decides what leaks; this file only reads
 * the files and the env. It prints file names, never a value. It stops when any
 * of the five variables is unset, naming them, so it never passes without
 * checking. Run it on its own with `npm run e2e:check-cache`.
 */
import { findCacheLeaks } from './support/cacheLeaks.ts';
import { loadLocalEnv, requireEnv } from './support/env.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE_DIR = fileURLToPath(new URL('../.e2e/cache', import.meta.url));
const SECRET_NAMES = [
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_UNVERIFIED_USER_EMAIL',
  'E2E_UNVERIFIED_USER_PASSWORD',
  'E2E_INTERVALS_API_KEY',
];

loadLocalEnv();

const secrets = requireEnv(
  SECRET_NAMES,
  'the cache leak check looks for their values in .e2e/cache',
);

const files = existsSync(CACHE_DIR)
  ? readdirSync(CACHE_DIR, { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => {
        const path = join(entry.parentPath, entry.name);

        return {
          name: relative(CACHE_DIR, path),
          content: readFileSync(path, 'utf8'),
        };
      })
  : [];
const leaks = findCacheLeaks(files, Object.values(secrets));

if (leaks.length > 0) {
  console.error(
    [
      `E2E cache leak check failed: these files hold the value of one of ${SECRET_NAMES.join(', ')}:`,
      ...leaks.map(name => `  .e2e/cache/${name}`),
      'Delete them and record the step again without typing the value as plain text (docs/agents/e2e-tests.md).',
    ].join('\n'),
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `E2E cache leak check: no secret in ${files.length} file(s) under .e2e/cache.\n`,
  );
}
