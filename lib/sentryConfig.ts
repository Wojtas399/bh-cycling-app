export type SentryBuild = {
  dsn: string | undefined;
  appEnv: string | undefined;
  isDev: boolean;
};

export function sentryOptions({ dsn }: SentryBuild) {
  if (!dsn) return null;

  return { dsn };
}
