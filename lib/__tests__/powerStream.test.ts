import type { IntervalsActivityStream } from '../intervalsApi';
import {
  type PowerStream,
  bucketPowerStream,
  toPowerStream,
} from '../powerStream';

/** One tick a second from `from`, `count` of them, all at `watts`. */
function steady(
  from: number,
  count: number,
  watts: number | null,
): PowerStream {
  return {
    time: Array.from({ length: count }, (_, i) => from + i),
    watts: Array.from({ length: count }, () => watts),
  };
}

function joined(...parts: PowerStream[]): PowerStream {
  return {
    time: parts.flatMap(({ time }) => time),
    watts: parts.flatMap(({ watts }) => watts),
  };
}

describe('bucketPowerStream', () => {
  it('averages a steady ride into equal buckets across the card', () => {
    expect(
      bucketPowerStream(steady(0, 400, 200), {
        start: 0,
        durationSeconds: 400,
        cardDurationSeconds: 400,
        bucketCount: 4,
      }),
    ).toEqual([
      { start: 0, end: 100, watts: 200 },
      { start: 100, end: 200, watts: 200 },
      { start: 200, end: 300, watts: 200 },
      { start: 300, end: 400, watts: 200 },
    ]);
  });

  it('smooths the power with a 30 s rolling mean centred on each tick', () => {
    // A minute's ride, 0 W for 30 s then 300 W, one bucket a second.
    const buckets = bucketPowerStream(
      joined(steady(0, 30, 0), steady(30, 30, 300)),
      {
        start: 0,
        durationSeconds: 60,
        cardDurationSeconds: 60,
        bucketCount: 60,
      },
    );
    const wattsAt = (second: number) =>
      buckets.find(({ start }) => start === second)?.watts;

    // 15 s either side: before the step there's nothing to lift it.
    expect(wattsAt(0)).toBe(0);
    expect(wattsAt(14)).toBe(0);
    // From 15 s on, the step's 300 W enter the window a tick at a time.
    expect(wattsAt(20)).toBe(50);
    expect(wattsAt(30)).toBe(150);
    expect(wattsAt(44)).toBe(290);
    expect(wattsAt(59)).toBe(300);
  });

  it('counts a tick with no power as 0 W', () => {
    expect(
      bucketPowerStream(
        { time: [0, 1, 2, 3], watts: [200, null, 200, null] },
        {
          start: 0,
          durationSeconds: 4,
          cardDurationSeconds: 4,
          bucketCount: 1,
        },
      ),
    ).toEqual([{ start: 0, end: 4, watts: 100 }]);
  });

  it('leaves a stop with no ticks as a gap, and never smooths across it', () => {
    // 100 W, a 100 s stop, then 300 W.
    const stream = joined(steady(0, 100, 100), steady(200, 100, 300));

    expect(
      bucketPowerStream(stream, {
        start: 0,
        durationSeconds: 300,
        cardDurationSeconds: 300,
        bucketCount: 3,
      }),
    ).toEqual([
      { start: 0, end: 100, watts: 100 },
      { start: 200, end: 300, watts: 300 },
    ]);
  });

  it("places the stream on the card's time scale, from the strip's start, ending early when the strip is shorter", () => {
    // The strip covers stream time 60–180 s of a card 240 s long. The 400 W
    // either side of it sit past a stop, out of the rolling mean's reach.
    const stream = joined(
      steady(0, 30, 400),
      steady(60, 120, 200),
      steady(210, 30, 400),
    );

    expect(
      bucketPowerStream(stream, {
        start: 60,
        durationSeconds: 120,
        cardDurationSeconds: 240,
        bucketCount: 4,
      }),
    ).toEqual([
      { start: 0, end: 60, watts: 200 },
      { start: 60, end: 120, watts: 200 },
    ]);
  });

  it("draws nothing past the card's end when the strip runs longer than the card", () => {
    expect(
      bucketPowerStream(steady(0, 400, 200), {
        start: 0,
        durationSeconds: 400,
        cardDurationSeconds: 200,
        bucketCount: 2,
      }),
    ).toEqual([
      { start: 0, end: 100, watts: 200 },
      { start: 100, end: 200, watts: 200 },
    ]);
  });

  it('draws nothing for a stream with no ticks in the strip', () => {
    expect(
      bucketPowerStream(steady(0, 60, 200), {
        start: 100,
        durationSeconds: 60,
        cardDurationSeconds: 60,
        bucketCount: 2,
      }),
    ).toEqual([]);
  });
});

describe('toPowerStream', () => {
  const time = (data: (number | null)[]): IntervalsActivityStream => ({
    type: 'time',
    data,
  });
  const watts = (data: (number | null)[]): IntervalsActivityStream => ({
    type: 'watts',
    data,
  });

  it('keeps the time and watts streams, ticks with no power included', () => {
    expect(toPowerStream([time([0, 1, 2]), watts([180, null, 210])])).toEqual({
      time: [0, 1, 2],
      watts: [180, null, 210],
    });
  });

  it.each<[string, IntervalsActivityStream[]]>([
    ['no streams at all', []],
    ['no watts stream', [time([0, 1, 2])]],
    ['an empty watts stream', [time([]), watts([])]],
    ['a watts stream with no power in it', [time([0, 1]), watts([null, null])]],
    ['no time stream to place the power by', [watts([180, 210])]],
  ])('is null, no stream, for %s', (_, streams) => {
    expect(toPowerStream(streams)).toBeNull();
  });
});
