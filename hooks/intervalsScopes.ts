/** The Intervals.icu scopes the app asks for at consent. */
const REQUESTED_SCOPES = [
  'ACTIVITY:READ',
  'CALENDAR:READ',
  'WELLNESS:READ',
  'SETTINGS:READ',
] as const;

export type IntervalsScope = (typeof REQUESTED_SCOPES)[number];

/**
 * The consent request's `scopes`, as one item: `expo-auth-session` joins items
 * with a space, Intervals.icu wants commas.
 */
export const CONSENT_SCOPES = [REQUESTED_SCOPES.join(',')];

/**
 * Whether a connection's stored `scope` shows `scope` wasn't granted, so no
 * request needing it has to go out to be refused. Intervals.icu separates
 * scopes with commas, OAuth with spaces; both are read. An unknown (`null`)
 * stored scope shows nothing, and the request itself decides.
 */
export function lacksScope(
  granted: string | null,
  scope: IntervalsScope,
): boolean {
  return granted !== null && !granted.split(/[\s,]+/).includes(scope);
}
