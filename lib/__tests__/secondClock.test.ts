import { getClockNow, subscribeToClock } from '../secondClock';

let unsubscribesRunAfterEachTest: (() => void)[] = [];

function subscribeUntilTestEnds(listener: () => void) {
  const unsubscribe = subscribeToClock(listener);

  unsubscribesRunAfterEachTest.push(unsubscribe);

  return unsubscribe;
}

describe('secondClock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    unsubscribesRunAfterEachTest.forEach(unsubscribe => unsubscribe());
    unsubscribesRunAfterEachTest = [];
    jest.useRealTimers();
  });

  it('ticks once a second while something listens', () => {
    const listener = jest.fn();

    subscribeUntilTestEnds(listener);
    const startedAt = Date.now();

    jest.advanceTimersByTime(3_000);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(getClockNow()).toBe(startedAt + 3_000);
  });

  it('reads the time afresh when it starts ticking', () => {
    jest.setSystemTime(new Date(2026, 9, 5, 12));

    subscribeUntilTestEnds(jest.fn());

    expect(getClockNow()).toBe(new Date(2026, 9, 5, 12).getTime());
  });

  it('keeps ticking for the listeners that stay', () => {
    const leaving = jest.fn();
    const staying = jest.fn();
    const unsubscribeLeaving = subscribeUntilTestEnds(leaving);

    subscribeUntilTestEnds(staying);

    unsubscribeLeaving();
    jest.advanceTimersByTime(2_000);

    expect(leaving).not.toHaveBeenCalled();
    expect(staying).toHaveBeenCalledTimes(2);
  });

  it('stops ticking once the last listener leaves', () => {
    const unsubscribe = subscribeUntilTestEnds(jest.fn());
    const stoppedAt = Date.now();

    unsubscribe();
    jest.advanceTimersByTime(5_000);

    expect(getClockNow()).toBe(stoppedAt);
    expect(jest.getTimerCount()).toBe(0);
  });
});
