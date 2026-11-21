import type { ActivityProfileSummary } from './activityDetails';
import type { Watts } from './intervalsApi';
import type { ProfileCard, ProfileStrip } from './profileCard';
import { type RideSettings, ftpPctToWatts } from './rideSettings';
import { roundToMillionth } from './roundToMillionth';
import type { StripSegment } from './stripSegment';
import {
  type TimeInZoneRow,
  type ZoneTimes,
  timeInZoneRows,
  zoneTimesOfSegments,
} from './timeInZone';
import type { WorkoutProfileSummary } from './workoutDetails';
import type { WorkoutBlock } from './workoutProfile';

export type ScaleUnit = 'watts' | 'ftpPct';

export interface StripPower {
  unit: ScaleUnit;
  peak: number;
  peakFtpPct: number;
  average: number;
}

export interface DetailedStrip<Summary> {
  summary: Summary;
  ftp: Watts | null;
  segments: StripSegment[];
  power: StripPower;
  zoneTimes: ZoneTimes;
}

export interface ProfileScale {
  unit: ScaleUnit;
  ceiling: number;
  gridlines: number[];
}

export interface DetailedProfile {
  durationSeconds: number;
  scale: ProfileScale;
  planned: DetailedStrip<WorkoutProfileSummary> | null;
  recorded: DetailedStrip<ActivityProfileSummary> | null;
  timeInZone: TimeInZoneRow[];
}

const MAX_EDGE_REACH_OVER_PEAK = 1.5;

const HEADROOM_OVER_PEAK = 1.05;

const CEILING_STEP = 10;

export function niceCeiling(peak: number, edges: number[]): number {
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

export function buildDetailedProfile(
  card: ProfileCard,
  settings: RideSettings,
): DetailedProfile {
  const { durationSeconds } = card;
  const unit = scaleUnit(card, settings.ftp);
  const planned =
    card.planned &&
    detailedStrip(
      card.planned,
      toSegments(card.planned.blocks, durationSeconds, card.planned.ftp, unit),
    );
  const recorded =
    card.recorded &&
    detailedStrip(
      card.recorded,
      toSegments(
        card.recorded.blocks,
        durationSeconds,
        card.recorded.ftp,
        unit,
      ),
    );

  return {
    durationSeconds,
    scale: sharedScale(
      [planned, recorded].filter(strip => strip !== null),
      unit,
      settings,
    ),
    planned,
    recorded,
    timeInZone: timeInZoneRows(
      planned?.zoneTimes ?? null,
      recorded?.zoneTimes ?? null,
    ),
  };
}

function scaleUnit(
  { planned, recorded }: ProfileCard,
  currentFtp: Watts | null,
): ScaleUnit {
  const strips = [planned, recorded].filter(strip => strip !== null);

  return currentFtp !== null && strips.every(strip => strip.ftp !== null)
    ? 'watts'
    : 'ftpPct';
}

function sharedScale(
  strips: DetailedStrip<unknown>[],
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

function detailedStrip<Summary>(
  { summary, ftp, zoneTimes }: ProfileStrip<Summary>,
  segments: StripSegment[],
): DetailedStrip<Summary> {
  return {
    summary,
    ftp,
    segments,
    power: stripPower(segments, ftp),
    zoneTimes: zoneTimes ?? zoneTimesOfSegments(segments),
  };
}

function stripPower(segments: StripSegment[], ftp: Watts | null): StripPower {
  const unit: ScaleUnit = ftp === null ? 'ftpPct' : 'watts';
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

function toSegments(
  blocks: WorkoutBlock[],
  durationSeconds: number,
  ftp: Watts | null,
  unit: ScaleUnit,
): StripSegment[] {
  const watts = (pct: number) =>
    ftp === null ? null : ftpPctToWatts(pct, ftp);
  let endSeconds = 0;

  return blocks.flatMap(({ widthFraction, minPct, maxPct, zone, ramp }) => {
    const startSeconds = endSeconds;

    endSeconds += widthFraction * durationSeconds;

    const drawsNothing = maxPct <= 0;

    if (drawsNothing) return [];

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
  });
}

function inUnit(pct: number, unit: ScaleUnit, ftp: Watts | null): number {
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
