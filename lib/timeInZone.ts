import type { IntervalsZoneTime } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { resolvePowerTarget } from './powerTarget';
import { type Zone, type ZoneConfig, isZone } from './powerZones';
import type { StripSegment } from './stripSegment';
import { type WorkoutStep, unrollRepeats } from './workoutProfile';

export type ZoneTimes = Readonly<Record<Zone, number>>;

const ZONES: Zone[] = [1, 2, 3, 4, 5, 6, 7];

export interface ZoneTimeBar {
  seconds: number;
  share: number;
}

export interface TimeInZoneRow {
  zone: Zone;
  planned: ZoneTimeBar | null;
  recorded: ZoneTimeBar | null;
}

function noZoneTimes(): Record<Zone, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
}

export const NO_ZONE_TIMES: ZoneTimes = noZoneTimes();

export function zoneTimesOfSegments(segments: StripSegment[]): ZoneTimes {
  const times = noZoneTimes();

  for (const { startSeconds, endSeconds, zone } of segments) {
    times[zone] += endSeconds - startSeconds;
  }

  return times;
}

const Z1_TO_Z7_ID = /^Z(\d)$/;

export function zoneTimesFromIcu(
  entries: IntervalsZoneTime[] | null | undefined,
): ZoneTimes | null {
  const times = noZoneTimes();
  let total = 0;

  for (const { id, secs } of entries ?? []) {
    const zone = Number(Z1_TO_Z7_ID.exec(id)?.[1]);

    if (isZone(zone) && isFiniteNumber(secs) && secs > 0) {
      times[zone] += secs;
      total += secs;
    }
  }

  return total > 0 ? times : null;
}

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
      addRampSplitByZoneOverlap(
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

function addRampSplitByZoneOverlap(
  times: Record<Zone, number>,
  durationSeconds: number,
  lowFtpPercent: number,
  highFtpPercent: number,
  config: ZoneConfig,
) {
  config.forEach(({ zone, minPct, maxPct }, index) => {
    const floor = index === 0 ? -Infinity : minPct;
    const ceiling = index === config.length - 1 ? Infinity : maxPct;
    const overlap =
      Math.min(highFtpPercent, ceiling) - Math.max(lowFtpPercent, floor);

    if (overlap > 0) {
      times[zone] +=
        (durationSeconds * overlap) / (highFtpPercent - lowFtpPercent);
    }
  });
}

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
