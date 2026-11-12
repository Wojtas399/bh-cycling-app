export interface CacheFile {
  name: string;
  content: string;
}

/**
 * The names of the replay cache files that hold any of `secrets`, each once.
 * An empty or unset secret never matches. Entries are JSON, so a secret is
 * also matched in its JSON-escaped form, e.g. a `"` in a password stored as `\"`.
 */
export function findCacheLeaks(
  files: readonly CacheFile[],
  secrets: readonly (string | undefined)[],
): string[] {
  const needles = secrets
    .filter((secret): secret is string => Boolean(secret))
    .flatMap(secret => [secret, JSON.stringify(secret).slice(1, -1)]);

  return files
    .filter(file => needles.some(needle => file.content.includes(needle)))
    .map(file => file.name);
}
