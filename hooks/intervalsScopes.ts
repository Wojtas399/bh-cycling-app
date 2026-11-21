const REQUESTED_SCOPES = [
  'ACTIVITY:READ',
  'CALENDAR:READ',
  'WELLNESS:READ',
  'SETTINGS:READ',
] as const;

export type IntervalsScope = (typeof REQUESTED_SCOPES)[number];

export const COMMA_SEPARATED_CONSENT_SCOPES = [REQUESTED_SCOPES.join(',')];

export function lacksScope(
  granted: string | null,
  scope: IntervalsScope,
): boolean {
  return granted !== null && !granted.split(/[\s,]+/).includes(scope);
}
