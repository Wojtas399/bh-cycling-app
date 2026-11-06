import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { FitnessLabels } from '@/lib/fitness';

/**
 * The words the Fitness screen dates its days with, for the readout and the
 * chart's time axis. The same object until the language changes, so the
 * chart, which redraws when its labels change, isn't redrawn on every render.
 */
export function useFitnessLabels(): FitnessLabels {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      today: t('fitness.chart.today'),
      monthsShort: t('note.monthsShort', { returnObjects: true }),
    }),
    [t],
  );
}
