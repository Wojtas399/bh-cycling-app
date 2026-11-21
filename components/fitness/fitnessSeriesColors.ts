import type { AppTheme } from '@/constants/theme';
import type { FitnessChartSeries } from '@/lib/fitnessChart';

export const FITNESS_SERIES_COLORS: Record<
  FitnessChartSeries,
  keyof AppTheme['colors']
> = {
  fitness: 'chartFitness',
  fatigue: 'chartFatigue',
  form: 'chartForm',
};
