export interface CacheFile {
  name: string;
  content: string;
}

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
