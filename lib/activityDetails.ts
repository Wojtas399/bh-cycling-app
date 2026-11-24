import {
  ACTIVITY_METRIC_FIELD_NAMES,
  type ActivityMetric,
  summariseActivity,
} from './activitySummary';
import type {
  IntervalsActivity,
  IntervalsActivityInterval,
} from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import type { LocalDateTimeString } from './localDateTime';
import { type Zone, isZone } from './powerZones';
import type { RecordedInterval, RecordedProfile } from './profileCard';
import { resolveFtp } from './rideSettings';
import { type RouteSummary, summariseRoute } from './route';
import { zoneTimesFromIcu } from './timeInZone';
import { pick } from './typed';

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
  'icu_zone_times',
] as const;

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

export type StoredActivity = Pick<
  IntervalsActivity,
  (typeof STORED_ACTIVITY_FIELDS)[number]
> & {
  type: string;
  icu_intervals?: StoredActivityInterval[];
};

export type StoredActivityDetails =
  | { isStravaActivity: false; activity: StoredActivity }
  | { isStravaActivity: true };

export type ActivityDetails =
  | {
      isStravaActivity: false;
      title: string | null;
      type: string;
      startLocal: LocalDateTimeString;
      recorded: RecordedProfile;
      metrics: ActivityMetric[];
      description?: string;
      route: RouteSummary | null;
      pairedEventId: number | null;
    }
  | { isStravaActivity: true };

export function toStoredActivityDetails(
  body: IntervalsActivity,
): StoredActivityDetails {
  const { type, icu_intervals } = body;
  const isStravaActivityBody = type == null;

  if (isStravaActivityBody) return { isStravaActivity: true };

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
    recorded: recordedProfileOf(activity),
    metrics: summariseActivity(activity),
    ...descriptionOf(activity),
    route: summariseRoute(activity),
    pairedEventId: activity.paired_event_id ?? null,
  };
}

export function routeOf(
  details: ActivityDetails | undefined,
): RouteSummary | null | undefined {
  if (details === undefined) return undefined;

  return details.isStravaActivity ? null : details.route;
}

export function pairedEventIdOf(
  details: ActivityDetails | undefined,
): number | null {
  if (details === undefined || details.isStravaActivity) return null;

  return details.pairedEventId;
}

function recordedProfileOf({
  icu_intervals,
  icu_ftp,
  icu_zone_times,
}: StoredActivity): RecordedProfile {
  const timed = (icu_intervals ?? [])
    .flatMap(toTimedIntervalIfTimesUsable)
    .sort((a, b) => a.start - b.start);
  const spanStart = timed.length > 0 ? timed[0].start : 0;
  const spanEnd = Math.max(spanStart, ...timed.map(({ end }) => end));

  return {
    intervals: timed.flatMap(interval =>
      powerIntervalFromSpanStart(interval, spanStart),
    ),
    endSeconds: spanEnd - spanStart,
    icuFtp: resolveFtp(icu_ftp),
    icuZoneTimes: zoneTimesFromIcu(icu_zone_times),
  };
}

function powerIntervalFromSpanStart(
  { start, end, intensity, zone }: TimedInterval,
  spanStart: number,
): RecordedInterval[] {
  if (intensity === null || zone === null) return [];

  return [
    {
      startSeconds: start - spanStart,
      endSeconds: end - spanStart,
      intensity,
      zone,
    },
  ];
}

interface TimedInterval {
  start: number;
  end: number;
  intensity: number | null;
  zone: Zone | null;
}

function toTimedIntervalIfTimesUsable({
  start_time,
  end_time,
  intensity,
  zone,
}: StoredActivityInterval): TimedInterval[] {
  if (
    !isFiniteNumber(start_time) ||
    !isFiniteNumber(end_time) ||
    end_time <= start_time
  ) {
    return [];
  }

  const hasPower = isFiniteNumber(intensity) && isZone(zone);

  return [
    {
      start: start_time,
      end: end_time,
      intensity: hasPower ? intensity : null,
      zone: hasPower ? zone : null,
    },
  ];
}

function descriptionOf({ description }: StoredActivity): {
  description?: string;
} {
  const trimmed = description?.trim();

  return trimmed ? { description: trimmed } : {};
}
