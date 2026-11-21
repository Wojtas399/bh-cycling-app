import type { Zone } from './powerZones';
import type { RampEnds } from './workoutProfile';

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

export interface SegmentRamp extends RampEnds {
  startWatts: number | null;
  endWatts: number | null;
  startOnScale: number;
  endOnScale: number;
}
