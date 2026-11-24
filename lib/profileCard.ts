import type { Watts } from './intervalsApi';
import type { Zone, ZoneConfig } from './powerZones';
import { type RideSettings, ftpPctToWatts } from './rideSettings';
import { roundToMillionth } from './roundToMillionth';
import {
  type TimeInZoneRow,
  type ZoneTimes,
  planZoneTimes,
  timeInZoneRows,
} from './timeInZone';
import {
  type RampEnds,
  type WorkoutStep,
  hasWorkoutProfile,
  stepsAtTheirTime,
} from './workoutProfile';

export type StripSide = 'planned' | 'recorded';

export type ScaleUnit = 'watts' | 'ftpPct';

export interface RecordedInterval {
  startSeconds: number;
  endSeconds: number;
  intensity: number;
  zone: Zone;
}

export interface RecordedProfile {
  intervals: RecordedInterval[];
  endSeconds: number;
  icuFtp: Watts | null;
  icuZoneTimes: ZoneTimes | null;
}

export interface ProfileCardInput {
  planned?: WorkoutStep[];
  recorded?: RecordedProfile;
}

export interface WorkoutProfileSummary {
  durationSeconds: number;
  stepCount: number;
  peakFtpPct: number;
}

export interface ActivityProfileSummary {
  durationSeconds: number;
  segmentCount: number;
  peakFtpPct: number;
}

export interface SegmentRamp extends RampEnds {
  startWatts: number | null;
  endWatts: number | null;
  startOnScale: number;
  endOnScale: number;
}

export interface StripSegment {
  startSeconds: number;
  endSeconds: number;
  minPct: number;
  maxPct: number;
  minWatts: number | null;
  maxWatts: number | null;
  lowOnScale: number;
  highOnScale: number;
  zone: Zone;
  ramp?: SegmentRamp;
}

export interface StripPower {
  unit: ScaleUnit;
  peak: number;
  peakFtpPct: number;
  average: number;
}

export interface ProfileStrip<Summary> {
  summary: Summary;
  ftp: number | null;
  segments: StripSegment[];
  power: StripPower;
  zoneTimes: ZoneTimes;
}

export interface ProfileScale {
  unit: ScaleUnit;
  ceiling: number;
  gridlines: number[];
}

export interface ProfileCard {
  durationSeconds: number;
  scale: ProfileScale;
  planned: ProfileStrip<WorkoutProfileSummary> | null;
  recorded: ProfileStrip<ActivityProfileSummary> | null;
  timeInZone: TimeInZoneRow[];
}

interface SegmentPower {
  minPct: number;
  maxPct: number;
  zone: Zone;
  ramp?: RampEnds;
}

interface TimedPower extends SegmentPower {
  startSeconds: number;
  endSeconds: number;
}

interface StripOnScale {
  ftp: number | null;
  unit: ScaleUnit;
}

export function buildProfileCard(
  { planned, recorded }: ProfileCardInput,
  settings: RideSettings,
): ProfileCard | null {
  const unit: ScaleUnit = settings.ftp === null ? 'ftpPct' : 'watts';
  const recordedStrip =
    recorded && recorded.intervals.length > 0
      ? recordedStripOf(recorded, {
          ftp: recorded.icuFtp ?? settings.ftp,
          unit,
        })
      : null;
  const plannedStrip =
    planned && hasWorkoutProfile(planned, settings.zoneConfig)
      ? plannedStripOf(planned, settings.zoneConfig, {
          ftp: settings.ftp,
          unit,
        })
      : null;

  if (!plannedStrip && !recordedStrip) return null;

  return {
    durationSeconds: Math.max(
      plannedStrip?.summary.durationSeconds ?? 0,
      recordedStrip?.summary.durationSeconds ?? 0,
    ),
    scale: sharedScale(
      [plannedStrip, recordedStrip].filter(strip => strip !== null),
      unit,
      settings,
    ),
    planned: plannedStrip,
    recorded: recordedStrip,
    timeInZone: timeInZoneRows(
      plannedStrip?.zoneTimes ?? null,
      recordedStrip?.zoneTimes ?? null,
    ),
  };
}

function plannedStripOf(
  steps: WorkoutStep[],
  zoneConfig: ZoneConfig,
  onScale: StripOnScale,
): ProfileStrip<WorkoutProfileSummary> {
  const atTheirTime = stepsAtTheirTime(steps, zoneConfig);
  const timed = atTheirTime.flatMap(({ startSeconds, endSeconds, band }) =>
    band ? [{ ...band, startSeconds, endSeconds }] : [],
  );
  const summary = {
    durationSeconds: atTheirTime.at(-1)?.endSeconds ?? 0,
    stepCount: timed.length,
    peakFtpPct: Math.max(0, ...timed.map(({ maxPct }) => maxPct)),
  };

  return stripOf(summary, timed, planZoneTimes(steps, zoneConfig), onScale);
}

function recordedStripOf(
  { intervals, endSeconds, icuZoneTimes }: RecordedProfile,
  onScale: StripOnScale,
): ProfileStrip<ActivityProfileSummary> {
  const timed = intervals.map(
    ({ startSeconds, endSeconds: intervalEnd, intensity, zone }) => ({
      startSeconds,
      endSeconds: intervalEnd,
      minPct: intensity,
      maxPct: intensity,
      zone,
    }),
  );
  const summary = {
    durationSeconds: endSeconds,
    segmentCount: intervals.length,
    peakFtpPct: Math.round(
      Math.max(...intervals.map(({ intensity }) => intensity)),
    ),
  };

  return stripOf(summary, timed, icuZoneTimes, onScale);
}

function stripOf<Summary>(
  summary: Summary,
  timed: TimedPower[],
  zoneTimes: ZoneTimes | null,
  onScale: StripOnScale,
): ProfileStrip<Summary> {
  const segments = timed.flatMap(power => segmentOf(power, onScale));

  return {
    summary,
    ftp: onScale.ftp,
    segments,
    power: stripPower(segments, onScale),
    zoneTimes: zoneTimes ?? zoneTimesOfSegments(segments),
  };
}

function segmentOf(
  { startSeconds, endSeconds, minPct, maxPct, zone, ramp }: TimedPower,
  { ftp, unit }: StripOnScale,
): StripSegment[] {
  const drawsNothing = maxPct <= 0;

  if (drawsNothing) return [];

  const watts = (pct: number) =>
    ftp === null ? null : ftpPctToWatts(pct, ftp);
  const segment: StripSegment = {
    startSeconds,
    endSeconds,
    minPct,
    maxPct,
    minWatts: watts(minPct),
    maxWatts: watts(maxPct),
    lowOnScale: inUnit(minPct, unit, ftp),
    highOnScale: inUnit(maxPct, unit, ftp),
    zone,
  };

  if (!ramp) return [segment];

  const { startPct, endPct } = ramp;

  return [
    {
      ...segment,
      ramp: {
        startPct,
        endPct,
        startWatts: watts(startPct),
        endWatts: watts(endPct),
        startOnScale: inUnit(startPct, unit, ftp),
        endOnScale: inUnit(endPct, unit, ftp),
      },
    },
  ];
}

function zoneTimesOfSegments(segments: StripSegment[]): ZoneTimes {
  const times: Record<Zone, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
  };

  for (const { startSeconds, endSeconds, zone } of segments) {
    times[zone] += endSeconds - startSeconds;
  }

  return times;
}

function stripPower(
  segments: StripSegment[],
  { ftp, unit }: StripOnScale,
): StripPower {
  let seconds = 0;
  let pctSeconds = 0;

  for (const { startSeconds, endSeconds, minPct, maxPct } of segments) {
    seconds += endSeconds - startSeconds;
    pctSeconds += ((minPct + maxPct) / 2) * (endSeconds - startSeconds);
  }

  const peakPct = Math.max(0, ...segments.map(({ maxPct }) => maxPct));
  const averagePct = seconds > 0 ? pctSeconds / seconds : 0;

  return {
    unit,
    peak: Math.round(inUnit(peakPct, unit, ftp)),
    peakFtpPct: Math.round(peakPct),
    average: Math.round(inUnit(averagePct, unit, ftp)),
  };
}

const MAX_EDGE_REACH_OVER_PEAK = 1.5;

const HEADROOM_OVER_PEAK = 1.05;

const CEILING_STEP = 10;

function niceCeiling(peak: number, edges: number[]): number {
  const edge = edges.find(candidate => candidate > peak);

  if (edge !== undefined && edge <= peak * MAX_EDGE_REACH_OVER_PEAK) {
    return edge;
  }

  const padded = roundToMillionth(peak * HEADROOM_OVER_PEAK);

  return Math.max(
    CEILING_STEP,
    Math.ceil(padded / CEILING_STEP) * CEILING_STEP,
  );
}

function sharedScale(
  strips: ProfileStrip<unknown>[],
  unit: ScaleUnit,
  { zoneConfig, ftp }: RideSettings,
): ProfileScale {
  const bandsBelowTheLastZone = zoneConfig.slice(0, -1);
  const edges = bandsBelowTheLastZone.map(({ maxPct }) => {
    const edge = inUnit(maxPct, unit, ftp);

    return unit === 'watts' ? Math.round(edge) : edge;
  });
  const peak = Math.max(
    0,
    ...strips.flatMap(({ segments }) =>
      segments.map(({ highOnScale }) => highOnScale),
    ),
  );
  const ceiling = niceCeiling(peak, edges);

  return { unit, ceiling, gridlines: edges.filter(edge => edge < ceiling) };
}

function inUnit(pct: number, unit: ScaleUnit, ftp: number | null): number {
  return unit === 'watts' && ftp !== null ? ftpPctToWatts(pct, ftp) : pct;
}

export function axisLabels(
  { ceiling, gridlines }: ProfileScale,
  plotHeightPx: number,
  minSpacingPx: number,
): number[] {
  const apart = (low: number, high: number) =>
    ((high - low) / ceiling) * plotHeightPx >= minSpacingPx;
  const labels = [0];

  for (const gridline of gridlines) {
    if (
      apart(labels[labels.length - 1], gridline) &&
      apart(gridline, ceiling)
    ) {
      labels.push(gridline);
    }
  }

  return [...labels, ceiling];
}
