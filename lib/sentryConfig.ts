export type SentryBuild = {
  dsn: string | undefined;
  appEnv: string | undefined;
  isDev: boolean;
};

export function sentryOptions({ dsn, appEnv, isDev }: SentryBuild) {
  if (!dsn || isDev) return null;

  return { dsn, environment: appEnv };
}
