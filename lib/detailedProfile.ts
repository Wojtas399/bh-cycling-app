import type { ActivityProfileSummary } from './activityDetails';
import type { ProfileCard, ProfileStrip } from './profileCard';
import { type RideSettings, ftpPctToWatts } from './rideSettings';
import type { StripSegment } from './stripSegment';
import {
  type TimeInZoneRow,
  type ZoneTimes,
  timeInZoneRows,
  zoneTimesOfSegments,
} from './timeInZone';
import type { WorkoutProfileSummary } from './workoutDetails';
import type { WorkoutBlock } from './workoutProfile';

/** The unit of the card's y-scale. */
export type ScaleUnit = 'watts' | 'ftpPct';

/**
 * A strip's power in a sentence for the screen reader: in watts, or in %FTP
 * when the strip has no FTP, whatever the card's scale is in.
 */
export interface StripPower {
  unit: ScaleUnit;
  /** The highest power the strip draws, rounded. */
  peak: number;
  /** `peak` in %FTP, rounded. */
  peakFtpPct: number;
  /**
   * The strip's average over the time it draws, rounded. A range counts at
   * its middle.
   */
  average: number;
}

/** One strip of the detailed card. */
export interface DetailedStrip<Summary> {
  /** The strip's own numbers, for the screen reader. */
  summary: Summary;
  /** See `ProfileStrip.ftp`. */
  ftp: number | null;
  /** Time-ordered. */
  segments: StripSegment[];
  power: StripPower;
  /**
   * The strip's time in each zone: its `ProfileStrip`'s when that's known,
   * otherwise what its segments draw.
   */
  zoneTimes: ZoneTimes;
}

/** The y-scale every strip of a card shares. */
export interface ProfileScale {
  unit: ScaleUnit;
  /** The top of the scale, in `unit`. Above zero. */
  ceiling: number;
  /**
   * The zone edges below `ceiling`, ascending, in `unit`: drawn as dashed
   * lines across every strip.
   */
  gridlines: number[];
}

/**
 * The large profile card with its scale: the strips of a `ProfileCard` as
 * timed segments in %FTP and watts.
 */
export interface DetailedProfile {
  /** The shared time scale, in s. */
  durationSeconds: number;
  scale: ProfileScale;
  planned: DetailedStrip<WorkoutProfileSummary> | null;
  recorded: DetailedStrip<ActivityProfileSummary> | null;
  /** The rows under the card, of the strips it has. */
  timeInZone: TimeInZoneRow[];
}

/** How far above the peak a zone edge may sit and still top the scale. */
const EDGE_REACH = 1.5;

/** Headroom over the peak when no zone edge tops the scale. */
const HEADROOM = 1.05;

/** What a ceiling with no zone edge rounds up to, in the scale's unit. */
const CEILING_STEP = 10;

/**
 * The top of the card's y-scale for its highest `peak`: the first of the
 * ascending zone `edges` above the peak, so the zone above the effort shows as
 * headroom. When that edge is more than 1.5× the peak away, or there is none,
 * the peak plus 5%, rounded up to 10. Never below 10, so a flat-zero strip
 * still has a scale to draw on.
 */
export function niceCeiling(peak: number, edges: number[]): number {
  const edge = edges.find(candidate => candidate > peak);

  if (edge !== undefined && edge <= peak * EDGE_REACH) return edge;

  // Rounded to a millionth first: 200 × 1.05 is 210.00000000000003, which
  // would otherwise round up to 220.
  const padded = Math.round(peak * HEADROOM * 1e6) / 1e6;

  return Math.max(
    CEILING_STEP,
    Math.ceil(padded / CEILING_STEP) * CEILING_STEP,
  );
}

/**
 * The detailed card of `card`, drawn against the athlete's current Ride
 * `settings`.
 */
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

/**
 * Watts, unless a strip has no FTP and can only be read in %FTP, or there's
 * no current FTP to set the zone edges at: then the whole card is in %FTP,
 * so its strips still share one scale.
 */
function scaleUnit(
  { planned, recorded }: ProfileCard,
  currentFtp: number | null,
): ScaleUnit {
  const strips = [planned, recorded].filter(strip => strip !== null);

  return currentFtp !== null && strips.every(strip => strip.ftp !== null)
    ? 'watts'
    : 'ftpPct';
}

/**
 * One y-scale for every strip, topped by `niceCeiling` of their highest peak,
 * with the athlete's zone edges as its gridlines. In watts, the edges sit at
 * the current FTP, to the whole watt. The last zone's ceiling isn't an edge:
 * power above it is still in that zone.
 */
function sharedScale(
  strips: DetailedStrip<unknown>[],
  unit: ScaleUnit,
  { zoneConfig, ftp }: RideSettings,
): ProfileScale {
  const edges = zoneConfig.slice(0, -1).map(({ maxPct }) => {
    const edge = inUnit(maxPct, unit, ftp);

    return unit === 'watts' ? Math.round(edge) : edge;
  });
  const peak = Math.max(
    0,
    ...strips.flatMap(({ segments }) => segments.map(({ high }) => high)),
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

function stripPower(segments: StripSegment[], ftp: number | null): StripPower {
  // In the strip's watts when it has an FTP to read them by.
  const unit: ScaleUnit = ftp === null ? 'ftpPct' : 'watts';
  let seconds = 0;
  let pctSeconds = 0;

  for (const { start, end, minPct, maxPct } of segments) {
    seconds += end - start;
    pctSeconds += ((minPct + maxPct) / 2) * (end - start);
  }

  // A strip that draws nothing, such as a ride at 0 W throughout, reads as 0.
  const peakPct = Math.max(0, ...segments.map(({ maxPct }) => maxPct));
  const averagePct = seconds > 0 ? pctSeconds / seconds : 0;

  return {
    unit,
    peak: Math.round(inUnit(peakPct, unit, ftp)),
    peakFtpPct: Math.round(peakPct),
    average: Math.round(inUnit(averagePct, unit, ftp)),
  };
}

/**
 * A strip's blocks as segments in s, from their shares of the card's
 * `durationSeconds`. A block with no height is time the strip doesn't draw.
 */
function toSegments(
  blocks: WorkoutBlock[],
  durationSeconds: number,
  ftp: number | null,
  unit: ScaleUnit,
): StripSegment[] {
  const watts = (pct: number) =>
    ftp === null ? null : ftpPctToWatts(pct, ftp);
  let end = 0;

  return blocks.flatMap(({ widthFraction, minPct, maxPct, zone }) => {
    const start = end;

    end += widthFraction * durationSeconds;

    if (maxPct <= 0) return [];

    return [
      {
        start,
        end,
        minPct,
        maxPct,
        minWatts: watts(minPct),
        maxWatts: watts(maxPct),
        low: inUnit(minPct, unit, ftp),
        high: inUnit(maxPct, unit, ftp),
        zone,
      },
    ];
  });
}

/**
 * `pct` %FTP in `unit`: in W of `ftp` on a watts scale, where every strip has
 * an FTP, and as it is on a %FTP scale.
 */
function inUnit(pct: number, unit: ScaleUnit, ftp: number | null): number {
  return unit === 'watts' && ftp !== null ? ftpPctToWatts(pct, ftp) : pct;
}

/**
 * The values to label on a strip's y-axis, ascending: zero, the ceiling, and
 * each gridline at least `minSpacing` from the label below it and from the
 * ceiling, on a plot `plotHeight` tall. Both are in px.
 */
export function axisLabels(
  { ceiling, gridlines }: ProfileScale,
  plotHeight: number,
  minSpacing: number,
): number[] {
  const apart = (low: number, high: number) =>
    ((high - low) / ceiling) * plotHeight >= minSpacing;
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
