import { useTranslation } from 'react-i18next';

import type { NoteDateLabels } from '@/lib/noteDates';

export function useNoteDateLabels(): NoteDateLabels {
  const { t } = useTranslation();

  return {
    weekdaysShort: t('note.weekdaysShort', { returnObjects: true }),
    monthsShort: t('note.monthsShort', { returnObjects: true }),
  };
}
