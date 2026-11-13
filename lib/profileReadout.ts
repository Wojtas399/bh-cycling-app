import type { DetailedProfile, ScaleUnit } from './detailedProfile';
import { formatPower } from './formatPower';
import type { Zone } from './powerZones';
import type { StripSide } from './profileCard';
import type { StripSegment } from './stripSegment';

/**
 * The segment a strip draws at `seconds` on the card's time scale: the block
 * the time falls in. A segment covers its start to its end; where two meet,
 * the later one. `null` where the strip draws nothing: a stop, or past its
 * end.
 */
export function segmentAt(
  segments: StripSegment[],
  seconds: number,
): StripSegment | null {
  // The last segment that starts by `seconds`: the segments are time-ordered.
  let low = 0;
  let high = segments.length - 1;
  let found: StripSegment | null = null;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (segments[middle].start <= seconds) {
      found = segments[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found !== null && seconds <= found.end ? found : null;
}

/**
 * The card's time under a pointer `x` px into a plot `plotWidth` wide that
 * spans `durationSeconds`. A finger dragged off the plot holds the pointer at
 * its edge.
 */
export function pointerSeconds(
  x: number,
  plotWidth: number,
  durationSeconds: number,
): number {
  if (plotWidth <= 0) return 0;

  return (Math.min(Math.max(x, 0), plotWidth) / plotWidth) * durationSeconds;
}

/** What one strip draws at the pointer. */
export interface StripReading {
  zone: Zone;
  /**
   * Its power, rounded: `88–93% · 220–233 W`, or `100% · 250 W` when flat or
   * on a ramp, read along the slope at the pointer. W is left out on a %FTP
   * card.
   */
  power: string;
}

/** The scrub readout: the pointer's time and each strip's reading there. */
export interface ProfileReadout {
  /** From the card's start: `12:34`, or `1:02:05` from an hour. */
  time: string;
  /**
   * The card's strips, the plan first. A reading is `null` where the strip
   * draws nothing: a stop, or past its end.
   */
  strips: { side: StripSide; reading: StripReading | null }[];
}

/** What the card reads at `seconds` on its time scale. */
export function profileReadout(
  {
    scale,
    planned,
    recorded,
  }: Pick<DetailedProfile, 'scale' | 'planned' | 'recorded'>,
  seconds: number,
): ProfileReadout {
  const read = (segments: StripSegment[]) => {
    const segment = segmentAt(segments, seconds);

    return (
      segment && {
        zone: segment.zone,
        power: power(span(segment, seconds), scale.unit),
      }
    );
  };

  return {
    time: clock(seconds),
    strips: [
      ...(planned
        ? [{ side: 'planned' as const, reading: read(planned.segments) }]
        : []),
      ...(recorded
        ? [{ side: 'recorded' as const, reading: read(recorded.segments) }]
        : []),
    ],
  };
}

/** A segment's power, from its lowest to its highest, in %FTP and W. */
type PowerSpan = Pick<
  StripSegment,
  'minPct' | 'maxPct' | 'minWatts' | 'maxWatts'
>;

/**
 * What a segment reads at `seconds`: its span, or on a ramp the one power
 * read linearly along the slope at that moment.
 */
function span(segment: StripSegment, seconds: number): PowerSpan {
  const { ramp, start, end } = segment;

  if (!ramp) return segment;

  const share = end > start ? (seconds - start) / (end - start) : 0;
  const along = (from: number, to: number) => from + (to - from) * share;
  const pct = along(ramp.startPct, ramp.endPct);
  const watts =
    ramp.startWatts !== null && ramp.endWatts !== null
      ? along(ramp.startWatts, ramp.endWatts)
      : null;

  return { minPct: pct, maxPct: pct, minWatts: watts, maxWatts: watts };
}

function power(
  { minPct, maxPct, minWatts, maxWatts }: PowerSpan,
  unit: ScaleUnit,
): string {
  const pct = formatPower('ftpPct', minPct, maxPct);

  // On the watts scale every strip has an FTP, so its segments have watts.
  return unit === 'watts' && minWatts !== null && maxWatts !== null
    ? `${pct} · ${formatPower('watts', minWatts, maxWatts)}`
    : pct;
}

function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}`
    : `${minutes}:${secs}`;
}
