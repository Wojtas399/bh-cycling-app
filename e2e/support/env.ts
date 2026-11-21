import { existsSync } from 'node:fs';

const ENV_FILE = new URL('../../.env.local', import.meta.url);

export function loadLocalEnv(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}

export function requireEnv<const Name extends string>(
  names: readonly Name[],
  purpose: string,
): Record<Name, string> {
  const values: Partial<Record<Name, string>> = {};

  for (const name of names) {
    if (process.env[name]) values[name] = process.env[name];
  }

  if (!hasEvery(values, names)) {
    const missing = names.filter(name => values[name] === undefined);

    throw new Error(`Set ${missing.join(' and ')} in .env.local: ${purpose}.`);
  }

  return values;
}

function hasEvery<Name extends string>(
  values: Partial<Record<Name, string>>,
  names: readonly Name[],
): values is Record<Name, string> {
  return names.every(name => values[name] !== undefined);
}
