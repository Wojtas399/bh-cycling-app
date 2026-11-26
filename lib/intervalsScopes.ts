export const CONNECTION_SCOPES = [
  'ACTIVITY:READ',
  'CALENDAR:READ',
  'SETTINGS:READ',
] as const;

export const HEALTH_DATA_SCOPE = 'WELLNESS:READ';

export type IntervalsScope =
  | (typeof CONNECTION_SCOPES)[number]
  | typeof HEALTH_DATA_SCOPE;

export function asOneCommaSeparatedScope(
  scopes: readonly IntervalsScope[],
): string[] {
  return [scopes.join(',')];
}

export function lacksScope(
  granted: string | null,
  scope: IntervalsScope,
): boolean {
  return granted !== null && !granted.split(/[\s,]+/).includes(scope);
}
