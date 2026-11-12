import type { IntervalsZoneTime } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { resolvePowerTarget } from './powerTarget';
import { type Zone, type ZoneConfig, isZone } from './powerZones';
import type { StripSegment } from './stripSegment';
import { type WorkoutStep, unrollRepeats } from './workoutProfile';

/** Seconds spent in each zone, Z1–Z7. */
export type ZoneTimes = Readonly<Record<Zone, number>>;

const ZONES: Zone[] = [1, 2, 3, 4, 5, 6, 7];

/** One side of a time-in-zone row: the plan's, or the ride's. */
export interface ZoneTimeBar {
  /** Whole s. */
  seconds: number;
  /** The bar's length, as a share of the longest time on any row: `0..1`. */
  share: number;
}

/**
 * A zone's time on the card, the plan's above the ride's. A side is `null`
 * when the card has no strip for it.
 */
export interface TimeInZoneRow {
  zone: Zone;
  planned: ZoneTimeBar | null;
  recorded: ZoneTimeBar | null;
}

function noZoneTimes(): Record<Zone, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
}

/** No time in any zone. */
export const NO_ZONE_TIMES: ZoneTimes = noZoneTimes();

/**
 * The time a strip draws in each zone: its blocks added up by zone. Time it doesn't draw, such as a stop, counts nowhere.
 */
export function zoneTimesOfSegments(segments: StripSegment[]): ZoneTimes {
  const times = noZoneTimes();

  for (const { start, end, zone } of segments) {
    times[zone] += end - start;
  }

  return times;
}

/** A Z1–Z7 entry's id: anything else, such as `SS`, overlaps those zones. */
const ZONE_ID = /^Z(\d)$/;

/**
 * The ride's time in each zone as intervals.icu counted it, from its
 * `icu_zone_times`, so the card and intervals.icu agree. Only `Z1`…`Z7` count;
 * Sweet Spot overlaps Z3 and Z4. `null` when there's no time in any of them,
 * and the card counts the strip instead.
 */
export function zoneTimesFromIcu(
  entries: IntervalsZoneTime[] | null | undefined,
): ZoneTimes | null {
  const times = noZoneTimes();
  let total = 0;

  for (const { id, secs } of entries ?? []) {
    const zone = Number(ZONE_ID.exec(id)?.[1]);

    if (isZone(zone) && isFiniteNumber(secs) && secs > 0) {
      times[zone] += secs;
      total += secs;
    }
  }

  return total > 0 ? times : null;
}

/**
 * The time a Workout's steps ask for in each zone, at the zones in `config`.
 * Repeats count once per rep. A step is counted in the zone the strip colours
 * it by, except a ramp, which rides every power on its way and so is split
 * between the zones it passes through. A step with no length, or no power on
 * the %FTP axis (a free ride, an HR target), counts nowhere.
 */
export function planZoneTimes(
  steps: WorkoutStep[] | null | undefined,
  config: ZoneConfig,
): ZoneTimes {
  const times = noZoneTimes();

  for (const { duration, power, ramp } of unrollRepeats(steps ?? [])) {
    const resolved = resolvePowerTarget(power, config);

    if (!resolved || !isFiniteNumber(duration) || duration <= 0) continue;

    const { start, end } = resolved.ftpPct;

    if (ramp === true && start !== end) {
      addRamp(
        times,
        duration,
        Math.min(start, end),
        Math.max(start, end),
        config,
      );
    } else {
      times[resolved.zone] += duration;
    }
  }

  return times;
}

/**
 * Adds a ramp from `low` to `high` %FTP, `duration` s long, to `times`: it
 * spends equal time at every power on the way, so each zone gets the share of
 * the span inside its band. Power below the first band or above the last is
 * still in that zone.
 */
function addRamp(
  times: Record<Zone, number>,
  duration: number,
  low: number,
  high: number,
  config: ZoneConfig,
) {
  config.forEach(({ zone, minPct, maxPct }, index) => {
    const floor = index === 0 ? -Infinity : minPct;
    const ceiling = index === config.length - 1 ? Infinity : maxPct;
    const overlap = Math.min(high, ceiling) - Math.max(low, floor);

    if (overlap > 0) times[zone] += (duration * overlap) / (high - low);
  });
}

/**
 * The card's time-in-zone rows: one for each zone, Z1 first, with time in the
 * plan or the ride. Times round to whole seconds, and every bar is measured
 * against the longest, so the plan and the ride compare at a glance.
 */
export function timeInZoneRows(
  planned: ZoneTimes | null,
  recorded: ZoneTimes | null,
): TimeInZoneRow[] {
  const seconds = (times: ZoneTimes | null, zone: Zone) =>
    times && Math.round(times[zone]);
  const longest = Math.max(
    0,
    ...ZONES.flatMap(zone => [
      seconds(planned, zone) ?? 0,
      seconds(recorded, zone) ?? 0,
    ]),
  );
  const bar = (time: number | null) =>
    time === null ? null : { seconds: time, share: time / longest };

  return ZONES.flatMap(zone => {
    const plannedSeconds = seconds(planned, zone);
    const recordedSeconds = seconds(recorded, zone);

    if (!plannedSeconds && !recordedSeconds) return [];

    return [
      {
        zone,
        planned: bar(plannedSeconds),
        recorded: bar(recordedSeconds),
      },
    ];
  });
}
