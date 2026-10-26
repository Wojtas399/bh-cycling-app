import {
  ACTIVITY_METRIC_FIELD_NAMES,
  type ActivityMetric,
  summariseActivity,
} from './activitySummary';
import type {
  IntervalsActivity,
  IntervalsActivityInterval,
} from './intervalsApi';
import type { LocalDateTimeString } from './localDateTime';
import { type RouteSummary, summariseRoute } from './route';
import type { WorkoutBlock } from './workoutProfile';

/**
 * The Activity fields Activity Details keeps from the ~71 KB body: the hero,
 * Opis, the summary metrics and the Route gate (see `activityHasRoute`). A
 * Route summary's `distance` and `elapsed_time` are metrics already.
 */
const STORED_ACTIVITY_FIELDS = [
  'id',
  'name',
  'type',
  'start_date_local',
  'description',
  ...ACTIVITY_METRIC_FIELD_NAMES,
  'stream_types',
  'trainer',
] as const;

/** What the Activity Profile needs of each detected interval. */
const STORED_INTERVAL_FIELDS = [
  'start_time',
  'end_time',
  'intensity',
  'zone',
] as const;

export type StoredActivityInterval = Pick<
  IntervalsActivityInterval,
  (typeof STORED_INTERVAL_FIELDS)[number]
>;

/**
 * What Activity Details keeps of an Activity it can show. A field the body
 * leaves out stays out.
 */
export type StoredActivity = Pick<
  IntervalsActivity,
  (typeof STORED_ACTIVITY_FIELDS)[number]
> & {
  type: string;
  /** The detected intervals, in time order, trimmed for the Profile. */
  icu_intervals?: StoredActivityInterval[];
};

/**
 * What the Activity Details query stores: the trimmed Activity, or a marker
 * for a Strava Activity, which intervals.icu can't share.
 */
export type StoredActivityDetails =
  | { isStravaActivity: false; activity: StoredActivity }
  | { isStravaActivity: true };

/** Numbers behind the Activity Profile's accessibility summary. */
export interface ActivityProfileSummary {
  /** The elapsed span the Profile covers, stops included, in s. */
  durationSeconds: number;
  /** Intervals drawn in the Profile. */
  segmentCount: number;
  /** The highest interval intensity, in %FTP, rounded. */
  peakFtpPct: number;
}

/**
 * The Activity Details screen's view model: numbers and structure only.
 * Labels and formatting are left to the screen. A Strava Activity (see
 * CONTEXT.md) has nothing to show, so it's a variant of its own the screen
 * branches on.
 */
export type ActivityDetails =
  | {
      isStravaActivity: false;
      /**
       * The Activity's name, trimmed. `null` when it's blank or missing, so
       * the screen falls back to the sport label.
       */
      title: string | null;
      /** intervals.icu's sport type, e.g. `Ride`, `VirtualRide`, `Run`. */
      type: string;
      /** The Activity's local start, a date-time with no zone. */
      startLocal: LocalDateTimeString;
      /** The Activity Profile, empty when there is no honest shape to draw. */
      blocks: WorkoutBlock[];
      /** `null` exactly when `blocks` is empty. */
      profileSummary: ActivityProfileSummary | null;
      /**
       * Podsumowanie: the summary metrics the Activity has, in display order,
       * the same for every sport.
       */
      metrics: ActivityMetric[];
      /** Opis: the athlete's description, trimmed. Absent when blank. */
      description?: string;
      /** What the Route banner needs, `null` when there is no Route. */
      route: RouteSummary | null;
    }
  | { isStravaActivity: true };

/**
 * Trims an Activity body to what Activity Details keeps. A body without a
 * `type` is a Strava Activity's (intervals.icu sends a `_note` in its place),
 * kept as a marker rather than as an empty Activity.
 */
export function toStoredActivityDetails(
  body: IntervalsActivity,
): StoredActivityDetails {
  const { type, icu_intervals } = body;

  if (type == null) return { isStravaActivity: true };

  return {
    isStravaActivity: false,
    activity: {
      ...pick(body, STORED_ACTIVITY_FIELDS),
      type,
      ...(icu_intervals != null && {
        icu_intervals: icu_intervals.map(interval =>
          pick(interval, STORED_INTERVAL_FIELDS),
        ),
      }),
    },
  };
}

/**
 * Builds the view model of a stored Activity. It doesn't depend on today, so
 * it's stable for the query's lifetime.
 */
export function buildActivityDetails(
  stored: StoredActivityDetails,
): ActivityDetails {
  if (stored.isStravaActivity) return { isStravaActivity: true };

  const { activity } = stored;

  return {
    isStravaActivity: false,
    title: activity.name?.trim() || null,
    type: activity.type,
    startLocal: activity.start_date_local,
    blocks: [],
    profileSummary: null,
    metrics: summariseActivity(activity),
    ...descriptionOf(activity),
    route: summariseRoute(activity),
  };
}

function descriptionOf({ description }: StoredActivity): {
  description?: string;
} {
  const trimmed = description?.trim();

  return trimmed ? { description: trimmed } : {};
}

/** The `keys` `source` has, and nothing else. */
function pick<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  return Object.fromEntries(
    keys.filter(key => key in source).map(key => [key, source[key]]),
  ) as Pick<T, K>;
}
