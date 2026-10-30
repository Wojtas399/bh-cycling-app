import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import Text from '@/components/Text';
import CalendarDayTile, {
  TILE_GAP,
} from '@/components/calendar/CalendarDayTile';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import { useToday } from '@/hooks/useToday';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import {
  type CalendarItemsByDate,
  type UnplannedActivity,
  calendarItemKey,
} from '@/lib/calendarItems';
import { noteFill, noteLabelColor } from '@/lib/noteColors';
import { formatNoteRange, formatNoteShortRange } from '@/lib/noteDates';
import type { Note } from '@/lib/notes';
import { weekNotes } from '@/lib/weekNotes';
import type { CalendarWorkout } from '@/lib/workoutStatus';

const STRIPE_WIDTH = 3;
const CHIP_DOT_SIZE = 8;

export interface CalendarWeekAgendaProps {
  /** Any date in the week to lay out. */
  week: Date;
  itemsByDate: CalendarItemsByDate;
  /** The Notes overlapping the week, in `id` order. */
  notes: Note[];
  onDayPress: (day: CalendarDay) => void;
  onWorkoutPress: (workout: CalendarWorkout) => void;
  onActivityPress: (activity: UnplannedActivity) => void;
  onNotePress: (note: Note) => void;
}

/**
 * The weekly agenda: a banner per multi-day Note above Monday, then Monday to
 * Sunday, each day a tile (the month grid's surface) holding its label, a
 * chip per single-day Note and a card per item — Workouts and Unplanned
 * Activities in one list. Days a multi-day Note covers get a stripe in its
 * colour along the tile's left edge. A rest day is a short tile holding its
 * label alone. Tapping a banner or chip opens the Note, a Workout or an
 * Activity opens it, and tapping elsewhere in the tile, a Strava Activity
 * included, opens the day sheet.
 */
export default function CalendarWeekAgenda({
  week,
  itemsByDate,
  notes,
  onDayPress,
  onWorkoutPress,
  onActivityPress,
  onNotePress,
}: CalendarWeekAgendaProps) {
  const labels = useCalendarLabels();
  const today = useToday();
  const days = getWeekDays(week);
  const layout = weekNotes(
    notes,
    days.map(day => day.date),
  );

  return (
    <Box testID="calendar-week-agenda" gap="base">
      {layout.banners.length > 0 && (
        <Box gap="sm">
          {layout.banners.map(note => (
            <NoteBanner
              key={note.id}
              note={note}
              when={formatNoteRange(note, labels.monthNamesGenitive)}
              onPress={() => onNotePress(note)}
            />
          ))}
        </Box>
      )}

      <Box style={{ gap: TILE_GAP }}>
        {days.map(day => {
          const isToday = day.date === today;
          const { stripes, chips } = layout.days[day.date];

          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => onDayPress(day)}
              // Not one grouped element, so a screen reader reaches the chips
              // and cards inside; the day label is the day's button instead.
              accessible={false}
              testID={`calendar-day-${day.date}`}
            >
              <CalendarDayTile flexDirection="row" padding="sm">
                {stripes.length > 0 && (
                  <Box
                    flexDirection="row"
                    gap="xs"
                    marginRight="sm"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    {stripes.map(note => (
                      <Box
                        key={note.id}
                        width={STRIPE_WIDTH}
                        borderRadius="full"
                        style={{ backgroundColor: noteFill(note.color) }}
                      />
                    ))}
                  </Box>
                )}

                <Box flex={1}>
                  <Text
                    variant={isToday ? 'body-s-medium' : 'body-s-regular'}
                    color={isToday ? 'accent' : 'textSecondary'}
                    accessibilityRole="button"
                    onPress={() => onDayPress(day)}
                  >
                    {labels.day(day)}
                  </Text>

                  {chips.length > 0 && (
                    <Box
                      flexDirection="row"
                      flexWrap="wrap"
                      gap="sm"
                      marginTop="sm"
                    >
                      {chips.map(note => (
                        <NoteChip
                          key={note.id}
                          note={note}
                          when={labels.day(day)}
                          onPress={() => onNotePress(note)}
                        />
                      ))}
                    </Box>
                  )}

                  {(itemsByDate[day.date] ?? []).map(item => (
                    <Box key={calendarItemKey(item)} marginTop="sm">
                      <CalendarItemTile
                        item={item}
                        onWorkoutPress={onWorkoutPress}
                        onActivityPress={onActivityPress}
                      />
                    </Box>
                  ))}
                </Box>
              </CalendarDayTile>
            </TouchableOpacity>
          );
        })}
      </Box>
    </Box>
  );
}

interface NoteButtonProps {
  note: Note;
  /** When the Note applies, as a screen reader announces it. */
  when: string;
  onPress: () => void;
}

/** A multi-day Note above the week: its title and short range on its fill. */
function NoteBanner({ note, when, onPress }: NoteButtonProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const noteTitle = useNoteTitle();
  const title = noteTitle(note);
  const color = noteLabelColor(note.color);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('accessibilityLabel', { title, when })}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        borderRadius="md"
        paddingHorizontal="md"
        paddingVertical="sm"
        style={{ backgroundColor: noteFill(note.color) }}
      >
        <Text
          variant="body-s-medium"
          numberOfLines={1}
          style={{ flex: 1, color }}
        >
          {title}
        </Text>
        <Text variant="body-xs-medium" marginLeft="sm" style={{ color }}>
          {formatNoteShortRange(note)}
        </Text>
      </Box>
    </TouchableOpacity>
  );
}

/** A single-day Note under its day's label: a colour dot and its title. */
function NoteChip({ note, when, onPress }: NoteButtonProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const noteTitle = useNoteTitle();
  const title = noteTitle(note);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('accessibilityLabel', { title, when })}
      style={{ maxWidth: '100%' }}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        alignSelf="flex-start"
        backgroundColor="bgSecondary"
        borderRadius="full"
        paddingHorizontal="md"
        paddingVertical="xs"
      >
        <Box
          width={CHIP_DOT_SIZE}
          height={CHIP_DOT_SIZE}
          borderRadius="full"
          marginRight="sm"
          style={{ backgroundColor: noteFill(note.color) }}
        />
        <Text
          variant="body-s-medium"
          color="textPrimary"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {title}
        </Text>
      </Box>
    </TouchableOpacity>
  );
}
