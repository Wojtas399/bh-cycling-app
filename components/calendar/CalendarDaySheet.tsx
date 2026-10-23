import { useTranslation } from 'react-i18next';

import BottomSheet from '@/components/BottomSheet';
import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import NoteCard from '@/components/NoteCard';
import Text from '@/components/Text';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import type { CalendarDay } from '@/lib/calendarGrid';
import { type CalendarItem, calendarItemKey } from '@/lib/calendarItems';
import { daySheetNoteDates } from '@/lib/noteDates';
import type { Note } from '@/lib/notes';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarDaySheetProps {
  /** Whether the sheet is open. */
  visible: boolean;
  /**
   * The day to draw. Kept after the sheet closes so the content stays put
   * while it slides out; `null` only before the first open.
   */
  day: CalendarDay | null;
  items: CalendarItem[];
  /** The Notes covering the day, in `id` order. */
  notes: Note[];
  /** The day has neither items nor Notes. */
  isEmpty: boolean;
  onClose: () => void;
  /** Opens a Workout's details; the caller dismisses the sheet. */
  onWorkoutPress: (workout: CalendarWorkout) => void;
  /** Opens a Note; the caller swaps this sheet for the Note's. */
  onNotePress: (note: Note) => void;
}

/**
 * Bottom sheet with one day's items — Workouts and Unplanned Activities in
 * one list — then a "Notatki" section of Note cards, scrollable when there
 * are several, or an empty-state message on a day with neither. Shows only
 * what it's given — the caller reads the day straight from data already on
 * screen.
 */
export default function CalendarDaySheet({
  visible,
  day,
  items,
  notes,
  isEmpty,
  onClose,
  onWorkoutPress,
  onNotePress,
}: CalendarDaySheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const labels = useCalendarLabels();

  if (!day) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={labels.day(day)}
      testID="calendar-day-sheet"
    >
      {isEmpty ? (
        <Text variant="body-l-regular" color="textSecondary">
          {t('emptyDay')}
        </Text>
      ) : (
        <Box gap="md">
          {items.map(item => (
            <CalendarItemTile
              key={calendarItemKey(item)}
              item={item}
              onWorkoutPress={onWorkoutPress}
            />
          ))}

          {notes.length > 0 ? (
            <Text
              variant="body-xs-medium"
              color="textTertiary"
              marginTop={items.length > 0 ? 'sm' : undefined}
              style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {t('notes')}
            </Text>
          ) : null}

          {notes.map(note => {
            const { when, subtitle } = daySheetNoteDates(
              note,
              labels.day(day),
              labels.monthNamesGenitive,
            );

            return (
              <NoteCard
                key={note.id}
                note={note}
                when={when}
                showWhen={false}
                subtitle={subtitle}
                onPress={() => onNotePress(note)}
              />
            );
          })}
        </Box>
      )}
    </BottomSheet>
  );
}
