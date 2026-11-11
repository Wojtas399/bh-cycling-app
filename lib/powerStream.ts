import type { IntervalsActivityStream } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

/**
 * An Activity's power stream as intervals.icu records it: one tick per
 * sample, `time[i]` in s from the Activity's start and `watts[i]` its power,
 * `null` where the tick has none.
 */
export interface PowerStream {
  time: number[];
  watts: (number | null)[];
}

/**
 * The power stream in an Activity's `time` and `watts` streams. `null`, no
 * stream, when either is missing or there's no power in it: the profile card
 * then draws the detected intervals instead. Ticks with no time are dropped,
 * as they can't be placed.
 */
export function toPowerStream(
  streams: IntervalsActivityStream[],
): PowerStream | null {
  const dataOf = (type: string) =>
    streams.find(stream => stream.type === type)?.data ?? [];
  const times = dataOf('time');
  const powers = dataOf('watts');
  const stream: PowerStream = { time: [], watts: [] };

  for (let i = 0; i < Math.min(times.length, powers.length); i += 1) {
    const tickTime = times[i];

    if (!isFiniteNumber(tickTime)) continue;

    stream.time.push(tickTime);
    stream.watts.push(isFiniteNumber(powers[i]) ? powers[i] : null);
  }

  return stream.watts.some(isFiniteNumber) ? stream : null;
}

/** Where a power stream sits on the profile card, and how finely it's drawn. */
export interface StreamPlacement {
  /** The stream time the strip starts at, in s: 0 on the card's time scale. */
  start: number;
  /** How long the strip lasts, in s. Ticks after it aren't drawn. */
  durationSeconds: number;
  /** The card's time scale, in s, which the buckets divide equally. */
  cardDurationSeconds: number;
  /** How many buckets the card's time scale divides into. */
  bucketCount: number;
}

/** A stretch of the card the stream draws at one power. */
export interface PowerBucket {
  /** On the card's time scale, in s. */
  start: number;
  /** On the card's time scale, in s. */
  end: number;
  /** The stream's mean power over the bucket, W. */
  watts: number;
}

/** The span of the rolling mean, in s of tick time. */
const SMOOTHING_SECONDS = 30;

/**
 * The stream drawn on the card: smoothed with a 30 s rolling mean (see
 * `smoothedWatts`), then averaged into `bucketCount` equal buckets across the
 * card's time scale, in time order.
 */
export function bucketPowerStream(
  stream: PowerStream,
  { start, durationSeconds, cardDurationSeconds, bucketCount }: StreamPlacement,
): PowerBucket[] {
  const smoothed = smoothedWatts(stream);
  const sums = new Array<number>(bucketCount).fill(0);
  const counts = new Array<number>(bucketCount).fill(0);

  stream.time.forEach((tickTime, i) => {
    const t = tickTime - start;

    if (t < 0 || t >= durationSeconds) return;

    const index = Math.floor((t / cardDurationSeconds) * bucketCount);

    sums[index] += smoothed[i];
    counts[index] += 1;
  });

  const width = cardDurationSeconds / bucketCount;

  return sums.flatMap((sum, index) =>
    counts[index] === 0
      ? []
      : [
          {
            start: index * width,
            end: (index + 1) * width,
            watts: sum / counts[index],
          },
        ],
  );
}

/**
 * Each tick's power as the mean of the ticks within 15 s either side of it,
 * by tick time rather than tick count, so the power either side of a long
 * stop never mixes. Centred, so an effort stays where it happened on the
 * time scale. A tick with no power counts as 0 W.
 */
function smoothedWatts({ time, watts }: PowerStream): number[] {
  const half = SMOOTHING_SECONDS / 2;
  const powerAt = (i: number) => watts[i] ?? 0;
  // The window is ticks `from` up to, not including, `to`.
  let from = 0;
  let to = 0;
  let sum = 0;

  return time.map(tickTime => {
    while (to < time.length && time[to] < tickTime + half) {
      sum += powerAt(to);
      to += 1;
    }

    while (time[from] < tickTime - half) {
      sum -= powerAt(from);
      from += 1;
    }

    return sum / (to - from);
  });
}
