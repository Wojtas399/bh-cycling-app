import { existsSync } from 'node:fs';

const ENV_FILE = new URL('../../.env.local', import.meta.url);

export function loadLocalEnv(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}

export function requireEnv<const Name extends string>(
  names: readonly Name[],
  purpose: string,
): Record<Name, string> {
  const missing = names.filter(name => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Set ${missing.join(' and ')} in .env.local: ${purpose}.`);
  }

  return Object.fromEntries(
    names.map(name => [name, process.env[name] as string]),
  ) as Record<Name, string>;
}
