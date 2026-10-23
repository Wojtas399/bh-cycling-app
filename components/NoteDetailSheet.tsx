import { useTranslation } from 'react-i18next';

import BottomSheet from '@/components/BottomSheet';
import NoteMarkdown from '@/components/NoteMarkdown';
import Text from '@/components/Text';
import type { NoteSheetController } from '@/hooks/useNoteSheet';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import { formatNoteDates } from '@/lib/noteDates';
import { stripNoteHtml } from '@/lib/stripNoteHtml';

export interface NoteDetailSheetProps {
  sheet: NoteSheetController;
}

/**
 * The full-height sheet showing one Note: its title (or "Notatka"), the days
 * it covers, and its text as Note Markdown (or a muted "Brak treści"). Any
 * HTML in the text is stripped first so tags never show. Used by Home and
 * the Calendar.
 */
export default function NoteDetailSheet({ sheet }: NoteDetailSheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const noteTitle = useNoteTitle();
  const { note } = sheet;
  const text = note?.description ? stripNoteHtml(note.description).trim() : '';

  return (
    <BottomSheet
      visible={sheet.visible}
      onClose={sheet.close}
      fullHeight
      title={note ? noteTitle(note) : undefined}
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
      {text ? (
        <NoteMarkdown text={text} />
      ) : (
        <Text variant="body-l-regular" color="textSecondary">
          {t('empty')}
        </Text>
      )}
    </BottomSheet>
  );
}
