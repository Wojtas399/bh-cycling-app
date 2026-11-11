// A missing appEnv labels as staging, matching app.config.ts's default.
export function formatAppVersion(
  version: string | undefined,
  appEnv: string | undefined,
): string {
  if (!version) return '';

  const env = appEnv ?? 'staging';

  return env === 'production' ? version : `${version} (${env})`;
}
