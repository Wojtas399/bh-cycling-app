const APP_CONFIG_DEFAULT_ENV = 'staging';

export function formatAppVersion(
  version: string | undefined,
  appEnv: string | undefined,
): string {
  if (!version) return '';

  const env = appEnv ?? APP_CONFIG_DEFAULT_ENV;

  return env === 'production' ? version : `${version} (${env})`;
}
