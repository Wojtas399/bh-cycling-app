import { NOTHING_CROSSED, crossesToJs } from '@/lib/crossesToJs';

function lastCrossed(initial: number) {
  let value = initial;

  return { get: () => value, set: (next: number) => void (value = next) };
}

function crossed(values: number[], last = lastCrossed(NOTHING_CROSSED)) {
  return values.filter(value => crossesToJs(value, last));
}

describe('crossesToJs', () => {
  it('crosses a value from the UI thread to JS only when it changes, so a drag doesn’t flood JS', () => {
    expect(crossed([3, 3, 4, 4, 4, 3])).toEqual([3, 4, 3]);
  });

  it('crosses the first value after a reset to NOTHING_CROSSED, even where the last drag ended', () => {
    const last = lastCrossed(NOTHING_CROSSED);

    crossed([7], last);
    last.set(NOTHING_CROSSED);

    expect(crossed([7], last)).toEqual([7]);
  });

  it('never mistakes column or day 0 for NOTHING_CROSSED', () => {
    expect(crossed([0])).toEqual([0]);
  });
});
