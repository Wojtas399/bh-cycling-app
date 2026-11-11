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
import { type Zone, isZone } from './powerZones';
import { resolveFtp } from './rideSettings';
import { type RouteSummary, summariseRoute } from './route';
import { GAP_BAND, type WorkoutBlock } from './workoutProfile';

/**
 * The Activity fields Activity Details keeps from the ~71 KB body: the hero,
 * Opis, the summary metrics, the Route gate (see `activityHasRoute`), the
 * paired event the Race header reads and the FTP the profile card's watts
 * come from. A Route summary's `distance` and `elapsed_time` are metrics
 * already.
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
  'paired_event_id',
  'icu_ftp',
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

/**
 * The Activity Profile's span, and the numbers behind its accessibility
 * summary.
 */
export interface ActivityProfileSummary {
  /**
   * Where the Profile starts, in s from the Activity's start: its first
   * interval's start. The power stream is placed from here.
   */
  startSeconds: number;
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
       * The FTP intervals.icu used for the ride, in W, which its intervals'
       * %FTP and zones are relative to. `null` when it has none usable.
       */
      icuFtp: number | null;
      /**
       * Podsumowanie: the summary metrics the Activity has, in display order,
       * the same for every sport.
       */
      metrics: ActivityMetric[];
      /** Opis: the athlete's description, trimmed. Absent when blank. */
      description?: string;
      /** What the Route banner needs, `null` when there is no Route. */
      route: RouteSummary | null;
      /**
       * The intervals.icu event the Activity is paired to, a Race or a
       * Workout; `null` when it isn't paired.
       */
      pairedEventId: number | null;
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
    ...activityProfileOf(activity),
    icuFtp: resolveFtp(activity.icu_ftp),
    metrics: summariseActivity(activity),
    ...descriptionOf(activity),
    route: summariseRoute(activity),
    pairedEventId: activity.paired_event_id ?? null,
  };
}

/**
 * The Route summary of loaded details: `undefined` while they load, `null`
 * when there is no Route (a Strava Activity included).
 */
export function routeOf(
  details: ActivityDetails | undefined,
): RouteSummary | null | undefined {
  if (details === undefined) return undefined;

  return details.isStravaActivity ? null : details.route;
}

/**
 * The event loaded details are paired to, for the Race header: `null` while
 * they load, when the Activity isn't paired, and for a Strava Activity.
 */
export function pairedEventIdOf(
  details: ActivityDetails | undefined,
): number | null {
  if (details === undefined || details.isStravaActivity) return null;

  return details.pairedEventId;
}

/**
 * The Activity Profile: each detected interval with a power intensity as one
 * flat block, as wide as its share of the elapsed span, from the first
 * interval's start to the last one's end. An interval without power or a zone
 * isn't guessed at: its time is left as an empty gap, so the rest stay where
 * they happened. A steady ride is one block. With no interval to draw (no
 * power, no intervals) there is no Profile.
 */
function activityProfileOf({
  icu_intervals,
}: StoredActivity): Pick<
  Extract<ActivityDetails, { isStravaActivity: false }>,
  'blocks' | 'profileSummary'
> {
  const timed = (icu_intervals ?? [])
    .flatMap(toTimedInterval)
    .sort((a, b) => a.start - b.start);
  const segments = timed.filter(isProfileSegment);

  if (segments.length === 0) {
    return { blocks: [], profileSummary: null };
  }

  const spanStart = timed[0].start;
  const spanEnd = Math.max(...timed.map(({ end }) => end));
  const durationSeconds = spanEnd - spanStart;
  const widthOf = (seconds: number) => seconds / durationSeconds;
  const blocks: WorkoutBlock[] = [];
  let drawnUntil = spanStart;

  for (const { start, end, intensity, zone } of segments) {
    if (start > drawnUntil) {
      blocks.push({ widthFraction: widthOf(start - drawnUntil), ...GAP_BAND });
    }

    blocks.push({
      widthFraction: widthOf(end - start),
      minPct: intensity,
      maxPct: intensity,
      zone,
    });
    drawnUntil = end;
  }

  if (spanEnd > drawnUntil) {
    blocks.push({ widthFraction: widthOf(spanEnd - drawnUntil), ...GAP_BAND });
  }

  return {
    blocks,
    profileSummary: {
      startSeconds: spanStart,
      durationSeconds,
      segmentCount: segments.length,
      peakFtpPct: Math.round(
        Math.max(...segments.map(({ intensity }) => intensity)),
      ),
    },
  };
}

/** An interval with a usable time span, with its power if it has one. */
interface TimedInterval {
  start: number;
  end: number;
  intensity: number | null;
  zone: Zone | null;
}

/** A timed interval with the power to be drawn. */
type ProfileSegment = TimedInterval & { intensity: number; zone: Zone };

/** An interval on the time axis, or none when its times are unusable. */
function toTimedInterval({
  start_time,
  end_time,
  intensity,
  zone,
}: StoredActivityInterval): TimedInterval[] {
  if (
    !Number.isFinite(start_time) ||
    !Number.isFinite(end_time) ||
    (end_time as number) <= (start_time as number)
  ) {
    return [];
  }

  const hasPower = Number.isFinite(intensity) && isZone(zone);

  return [
    {
      start: start_time as number,
      end: end_time as number,
      intensity: hasPower ? (intensity as number) : null,
      zone: hasPower ? zone : null,
    },
  ];
}

function isProfileSegment(interval: TimedInterval): interval is ProfileSegment {
  return interval.intensity !== null && interval.zone !== null;
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
