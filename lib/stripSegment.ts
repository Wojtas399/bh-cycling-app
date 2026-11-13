import type { Zone } from './powerZones';

/**
 * A stretch of a strip drawn at one power, or one range of power, in time
 * order. Time a strip doesn't draw, such as a stop or what's left after it
 * ends, has no segment.
 */
export interface StripSegment {
  /** Where it starts on the card's time scale, in s. */
  start: number;
  /** Where it ends on the card's time scale, in s. */
  end: number;
  /** Lowest power, in %FTP of the strip's FTP. */
  minPct: number;
  /** Highest power, in %FTP. Equals `minPct` when flat. */
  maxPct: number;
  /** `minPct` in W, `null` when the strip has no FTP. */
  minWatts: number | null;
  /** `maxPct` in W, `null` when the strip has no FTP. */
  maxWatts: number | null;
  /** `minPct` on the card's scale, in its unit: where the solid bar ends. */
  low: number;
  /** `maxPct` on the card's scale, in its unit: the top of the bar. */
  high: number;
  zone: Zone;
  /**
   * Set when the stretch is a ramp: where its power starts and ends, in the
   * order it's ridden. Drawn as a slope rather than a range.
   */
  ramp?: SegmentRamp;
}

/**
 * A ramp's power at its start and end, in ridden order. Its lower end is the
 * segment's `minPct`, its higher end `maxPct`.
 */
export interface SegmentRamp {
  /** In %FTP of the strip's FTP. */
  startPct: number;
  endPct: number;
  /** In W, `null` when the strip has no FTP. */
  startWatts: number | null;
  endWatts: number | null;
  /** On the card's scale, in its unit, like `low` and `high`. */
  startOnScale: number;
  endOnScale: number;
}
