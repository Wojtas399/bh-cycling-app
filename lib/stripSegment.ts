import type { Zone } from './powerZones';
import type { RampEnds } from './workoutProfile';

export interface StripSegment {
  /** Where it starts on the card's time scale, in s. */
  start: number;
  /** Where it ends on the card's time scale, in s. */
  end: number;
  minPct: number;
  maxPct: number;
  minWatts: number | null;
  maxWatts: number | null;
  /** `minPct` on the card's scale, in its unit: where the solid bar ends. */
  low: number;
  /** `maxPct` on the card's scale, in its unit: the top of the bar. */
  high: number;
  zone: Zone;
  ramp?: SegmentRamp;
}

export interface SegmentRamp extends RampEnds {
  startWatts: number | null;
  endWatts: number | null;
  startOnScale: number;
  endOnScale: number;
}
