import { useFitnessLabels } from '../useFitnessLabels';
import { renderHook } from '@testing-library/react-native';

const mockMonthsShort = ['sty', 'lut', 'mar'];

function mockT(key: string) {
  if (key === 'fitness.chart.today') return 'Dziś';

  return key === 'note.monthsShort' ? mockMonthsShort : key;
}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

describe('useFitnessLabels', () => {
  it('names today "Dziś" and the months by their short names', async () => {
    const { result } = await renderHook(() => useFitnessLabels());

    expect(result.current).toEqual({
      today: 'Dziś',
      monthsShort: ['sty', 'lut', 'mar'],
    });
  });

  it('gives the same labels on every render, so the chart is not redrawn', async () => {
    const { result, rerender } = await renderHook(() => useFitnessLabels());
    const first = result.current;

    await rerender({});

    expect(result.current).toBe(first);
  });
});
