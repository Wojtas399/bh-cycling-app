import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { FitnessLabels } from '@/lib/fitness';

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
