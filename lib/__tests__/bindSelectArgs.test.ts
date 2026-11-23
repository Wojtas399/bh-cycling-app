import { bindSelectArgs } from '../bindSelectArgs';

describe('bindSelectArgs', () => {
  it('hands the select the stored value first, then the bound selectArgs', () => {
    const selectBetween = (stored: number[], from: number, to: number) =>
      stored.slice(from, to);

    expect(bindSelectArgs(selectBetween, 1, 3)([10, 20, 30, 40])).toEqual([
      20, 30,
    ]);
  });
});
