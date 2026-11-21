import {
  ACTIVITY_METRIC_FIELD_NAMES,
  type ActivityMetric,
  summariseActivity,
} from './activitySummary';
import type {
  IntervalsActivity,
  IntervalsActivityInterval,
  Watts,
} from './intervalsApi';
import type { LocalDateTimeString } from './localDateTime';
import { type Zone, isZone } from './powerZones';
import { resolveFtp } from './rideSettings';
import { type RouteSummary, summariseRoute } from './route';
import { type ZoneTimes, zoneTimesFromIcu } from './timeInZone';
import { pick } from './typed';
import { GAP_BAND, type WorkoutBlock } from './workoutProfile';

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

export interface ActivityProfileSummary {
  durationSeconds: number;
  segmentCount: number;
  peakFtpPct: number;
}

export type ActivityDetails =
  | {
      isStravaActivity: false;
      title: string | null;
      type: string;
      startLocal: LocalDateTimeString;
      blocks: WorkoutBlock[];
      profileSummary: ActivityProfileSummary | null;
      icuFtp: Watts | null;
      zoneTimes: ZoneTimes | null;
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
    ...activityProfileOf(activity),
    icuFtp: resolveFtp(activity.icu_ftp),
    zoneTimes: zoneTimesFromIcu(activity.icu_zone_times),
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

function activityProfileOf({
  icu_intervals,
}: StoredActivity): Pick<
  Extract<ActivityDetails, { isStravaActivity: false }>,
  'blocks' | 'profileSummary'
> {
  const timed = (icu_intervals ?? [])
    .flatMap(toTimedIntervalIfTimesUsable)
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
      durationSeconds,
      segmentCount: segments.length,
      peakFtpPct: Math.round(
        Math.max(...segments.map(({ intensity }) => intensity)),
      ),
    },
  };
}

interface TimedInterval {
  start: number;
  end: number;
  intensity: number | null;
  zone: Zone | null;
}

type ProfileSegment = TimedInterval & { intensity: number; zone: Zone };

function toTimedIntervalIfTimesUsable({
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
