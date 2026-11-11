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
}
