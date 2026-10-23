import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { Note } from '@/lib/notes';

/** How every screen titles a Note: its name, or "Notatka" without one. */
export function useNoteTitle(): (note: Note) => string {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });

  return useCallback((note: Note) => note.name ?? t('untitled'), [t]);
}
