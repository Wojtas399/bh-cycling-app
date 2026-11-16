import { createListeners } from '../externalStore';

describe('createListeners', () => {
  it('notifies every listener until it unsubscribes', () => {
    const listeners = createListeners();
    const leaving = jest.fn();
    const staying = jest.fn();
    const unsubscribeLeaving = listeners.subscribe(leaving);

    listeners.subscribe(staying);
    listeners.notify();
    unsubscribeLeaving();
    listeners.notify();

    expect(leaving).toHaveBeenCalledTimes(1);
    expect(staying).toHaveBeenCalledTimes(2);
  });

  it('runs its source only while anything listens', () => {
    const stop = jest.fn();
    const start = jest.fn(() => stop);
    const listeners = createListeners(start);
    const unsubscribeFirst = listeners.subscribe(jest.fn());
    const unsubscribeSecond = listeners.subscribe(jest.fn());

    expect(start).toHaveBeenCalledTimes(1);

    unsubscribeFirst();

    expect(stop).not.toHaveBeenCalled();

    unsubscribeSecond();

    expect(stop).toHaveBeenCalledTimes(1);

    listeners.subscribe(jest.fn());

    expect(start).toHaveBeenCalledTimes(2);
  });
});
