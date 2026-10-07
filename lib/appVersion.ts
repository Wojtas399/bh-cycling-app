export function formatAppVersion(
  version: string | undefined,
  appEnv: string | undefined,
): string {
  if (!version) return '';

  return appEnv === 'production' ? version : `${version} (staging)`;
}
