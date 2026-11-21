import type { UnplannedActivity } from '@/lib/calendarItems';

type UnplannedSharedActivity = Extract<UnplannedActivity, { name: string }>;
type UnplannedStravaActivity = Extract<
  UnplannedActivity,
  { isStravaActivity: true }
>;

export function unplannedActivity(
  overrides: Partial<UnplannedSharedActivity> = {},
): UnplannedSharedActivity {
  return {
    id: 'a1',
    date: '2026-11-14',
    name: 'Dojazd do pracy',
    type: 'Ride',
    ...overrides,
  };
}

export function unplannedStravaActivity(
  overrides: Partial<UnplannedStravaActivity> = {},
): UnplannedStravaActivity {
  return {
    id: 'a2',
    date: '2026-11-14',
    isStravaActivity: true,
    ...overrides,
  };
}
