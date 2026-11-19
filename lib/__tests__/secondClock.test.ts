import { getClockNow, subscribeToClock as subscribe } from '../secondClock';

// The clock is module state shared by every test, so each test's listeners
// leave before the next test, even when an assertion fails first.
let subscriptions: (() => void)[] = [];

function subscribeToClock(listener: () => void) {
  const unsubscribe = subscribe(listener);

  subscriptions.push(unsubscribe);

  return unsubscribe;
}

describe('secondClock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    subscriptions.forEach(unsubscribe => unsubscribe());
    subscriptions = [];
    jest.useRealTimers();
  });

  it('ticks once a second while something listens', () => {
    const listener = jest.fn();

    subscribeToClock(listener);
    const startedAt = Date.now();

    jest.advanceTimersByTime(3_000);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(getClockNow()).toBe(startedAt + 3_000);
  });

  it('reads the time afresh when it starts ticking', () => {
    jest.setSystemTime(new Date(2026, 9, 5, 12));

    subscribeToClock(jest.fn());

    expect(getClockNow()).toBe(new Date(2026, 9, 5, 12).getTime());
  });

  it('keeps ticking for the listeners that stay', () => {
    const leaving = jest.fn();
    const staying = jest.fn();
    const unsubscribeLeaving = subscribeToClock(leaving);

    subscribeToClock(staying);

    unsubscribeLeaving();
    jest.advanceTimersByTime(2_000);

    expect(leaving).not.toHaveBeenCalled();
    expect(staying).toHaveBeenCalledTimes(2);
  });

  it('stops ticking once the last listener leaves', () => {
    const unsubscribe = subscribeToClock(jest.fn());
    const stoppedAt = Date.now();

    unsubscribe();
    jest.advanceTimersByTime(5_000);

    expect(getClockNow()).toBe(stoppedAt);
    expect(jest.getTimerCount()).toBe(0);
  });
});
