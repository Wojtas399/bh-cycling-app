import { useTranslation } from 'react-i18next';

import BottomSheet from '@/components/BottomSheet';
import Text from '@/components/Text';
import type { NoteSheetController } from '@/hooks/useNoteSheet';
import { formatNoteDates } from '@/lib/noteDates';

export interface NoteDetailSheetProps {
  sheet: NoteSheetController;
}

/**
 * The full-height sheet showing one Note: its title (or "Notatka"), the days
 * it covers, and its text (or a muted "Brak treści"). The text shows as plain
 * text for now; Note Markdown rendering comes later.
 */
export default function NoteDetailSheet({ sheet }: NoteDetailSheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const { note } = sheet;

  return (
    <BottomSheet
      visible={sheet.visible}
      onClose={sheet.close}
      fullHeight
      title={note ? (note.name ?? t('untitled')) : undefined}
      subtitle={
        note
          ? formatNoteDates(note, {
              weekdaysShort: t('weekdaysShort', { returnObjects: true }),
              monthsShort: t('monthsShort', { returnObjects: true }),
            })
          : undefined
      }
      testID="note-detail-sheet"
    >
      {note?.description ? (
        <Text variant="body-l-regular">{note.description}</Text>
      ) : (
        <Text variant="body-l-regular" color="textSecondary">
          {t('empty')}
        </Text>
      )}
    </BottomSheet>
  );
}
