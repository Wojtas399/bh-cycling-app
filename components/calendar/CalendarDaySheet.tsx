import { useTranslation } from 'react-i18next';

import BottomSheet from '@/components/BottomSheet';
import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import NoteCard from '@/components/NoteCard';
import Text from '@/components/Text';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import type { CalendarDay } from '@/lib/calendarGrid';
import {
  type CalendarItem,
  type UnplannedActivity,
  calendarItemKey,
} from '@/lib/calendarItems';
import { daySheetNoteDates } from '@/lib/noteDates';
import type { Note } from '@/lib/notes';
import type { Race } from '@/lib/races';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarDaySheetProps {
  visible: boolean;
  day: CalendarDay | null;
  items: CalendarItem[];
  notes: Note[];
  isEmpty: boolean;
  onClose: () => void;
  onDismissed: () => void;
  onWorkoutPress: (workout: CalendarWorkout) => void;
  onActivityPress: (activity: UnplannedActivity) => void;
  onRacePress: (race: Race) => void;
  onNotePress: (note: Note) => void;
}

export default function CalendarDaySheet({
  visible,
  day,
  items,
  notes,
  isEmpty,
  onClose,
  onDismissed,
  onWorkoutPress,
  onActivityPress,
  onRacePress,
  onNotePress,
}: CalendarDaySheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const labels = useCalendarLabels();

  if (!day) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
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
              onActivityPress={onActivityPress}
              onRacePress={onRacePress}
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
                showWhenBesideTitle={false}
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
