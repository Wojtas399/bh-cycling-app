import { formatPower } from './formatPower';
import type { Zone } from './powerZones';
import type {
  ProfileCard,
  ScaleUnit,
  StripSegment,
  StripSide,
} from './profileCard';

function lastSegmentStartingBy(
  timeOrderedSegments: StripSegment[],
  seconds: number,
): StripSegment | null {
  let low = 0;
  let high = timeOrderedSegments.length - 1;
  let found: StripSegment | null = null;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (timeOrderedSegments[middle].startSeconds <= seconds) {
      found = timeOrderedSegments[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

export function segmentAt(
  segments: StripSegment[],
  seconds: number,
): StripSegment | null {
  const found = lastSegmentStartingBy(segments, seconds);

  return found !== null && seconds <= found.endSeconds ? found : null;
}

export function pointerSeconds(
  xPx: number,
  plotWidthPx: number,
  durationSeconds: number,
): number {
  if (plotWidthPx <= 0) return 0;

  const xHeldOnThePlot = Math.min(Math.max(xPx, 0), plotWidthPx);

  return (xHeldOnThePlot / plotWidthPx) * durationSeconds;
}

export interface StripReading {
  zone: Zone;
  power: string;
}

export interface ProfileReadout {
  time: string;
  strips: { side: StripSide; reading: StripReading | null }[];
}

export function profileReadout(
  {
    scale,
    planned,
    recorded,
  }: Pick<ProfileCard, 'scale' | 'planned' | 'recorded'>,
  seconds: number,
): ProfileReadout {
  const read = (segments: StripSegment[]) => {
    const segment = segmentAt(segments, seconds);

    return (
      segment && {
        zone: segment.zone,
        power: formatReadingPower(powerAt(segment, seconds), scale.unit),
      }
    );
  };

  return {
    time: clockFromCardStart(seconds),
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

type PowerSpan = Pick<
  StripSegment,
  'minPct' | 'maxPct' | 'minWatts' | 'maxWatts'
>;

function powerAt(segment: StripSegment, seconds: number): PowerSpan {
  const { ramp, startSeconds, endSeconds } = segment;

  if (!ramp) return segment;

  const share =
    endSeconds > startSeconds
      ? (seconds - startSeconds) / (endSeconds - startSeconds)
      : 0;
  const along = (from: number, to: number) => from + (to - from) * share;
  const pct = along(ramp.startPct, ramp.endPct);
  const watts =
    ramp.startWatts !== null && ramp.endWatts !== null
      ? along(ramp.startWatts, ramp.endWatts)
      : null;

  return { minPct: pct, maxPct: pct, minWatts: watts, maxWatts: watts };
}

function formatReadingPower(
  { minPct, maxPct, minWatts, maxWatts }: PowerSpan,
  unit: ScaleUnit,
): string {
  const pct = formatPower('ftpPct', minPct, maxPct);

  return unit === 'watts' && minWatts !== null && maxWatts !== null
    ? `${pct} · ${formatPower('watts', minWatts, maxWatts)}`
    : pct;
}

function clockFromCardStart(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}`
    : `${minutes}:${secs}`;
}
