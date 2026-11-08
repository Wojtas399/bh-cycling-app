import type { AppTheme } from '@/constants/theme';
import type { FitnessChartSeries } from '@/lib/fitnessChart';

/** Each series' colour: its line and today's dot on the chart, its readout dot. */
export const FITNESS_SERIES_COLORS: Record<
  FitnessChartSeries,
  keyof AppTheme['colors']
> = {
  fitness: 'chartFitness',
  fatigue: 'chartFatigue',
  form: 'chartForm',
};
