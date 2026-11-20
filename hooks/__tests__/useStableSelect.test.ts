import { useStableSelect } from '../useStableSelect';
import { renderHook } from '@testing-library/react-native';

function selectAsOf(today: string) {
  return (dates: string[]) => dates.filter(date => date <= today);
}

describe('useStableSelect', () => {
  it('builds the select from its arguments', async () => {
    const { result } = await renderHook(() =>
      useStableSelect(selectAsOf, '2026-11-20'),
    );

    expect(result.current(['2026-11-19', '2026-11-21'])).toEqual([
      '2026-11-19',
    ]);
  });

  it('keeps the same select across renders while its arguments are the same, so React Query reuses the selected data', async () => {
    const buildSelect = jest.fn(selectAsOf);
    let today = '2026-11-20';
    const { result, rerender } = await renderHook(() =>
      useStableSelect(buildSelect, today),
    );
    const first = result.current;

    today = '2026-11-20';
    await rerender(undefined);

    expect(result.current).toBe(first);
    expect(buildSelect).toHaveBeenCalledTimes(1);
  });

  it('builds a new select once an argument changes', async () => {
    let today = '2026-11-20';
    const { result, rerender } = await renderHook(() =>
      useStableSelect(selectAsOf, today),
    );
    const first = result.current;

    today = '2026-11-21';
    await rerender(undefined);

    expect(result.current).not.toBe(first);
  });

  it('compares every argument, for a select built from several', async () => {
    const combineBetween = (start: number, end: number) => (values: number[]) =>
      values.filter(value => value >= start && value <= end);
    let end = 5;
    const { result, rerender } = await renderHook(() =>
      useStableSelect(combineBetween, 1, end),
    );
    const first = result.current;

    end = 6;
    await rerender(undefined);

    expect(result.current).not.toBe(first);
    expect(result.current([0, 1, 6, 7])).toEqual([1, 6]);
  });
});
