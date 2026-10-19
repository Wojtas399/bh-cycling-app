import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import Text from '@/components/Text';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useToday } from '@/hooks/useToday';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import { type CalendarItemsByDate, calendarItemKey } from '@/lib/calendarItems';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarWeekAgendaProps {
  /** Any date in the week to lay out. */
  week: Date;
  itemsByDate: CalendarItemsByDate;
  onDayPress: (day: CalendarDay) => void;
  onWorkoutPress: (workout: CalendarWorkout) => void;
}

/**
 * The weekly agenda: Monday to Sunday, each day's label followed by a card
 * per item — Workouts and Unplanned Activities in one list. Rest days show
 * the label alone. Tapping a Workout opens it; tapping elsewhere in the day,
 * an Activity included, opens the day sheet.
 */
export default function CalendarWeekAgenda({
  week,
  itemsByDate,
  onDayPress,
  onWorkoutPress,
}: CalendarWeekAgendaProps) {
  const labels = useCalendarLabels();
  const today = useToday();

  return (
    <Box testID="calendar-week-agenda" gap="base">
      {getWeekDays(week).map(day => {
        const isToday = day.date === today;

        return (
          <TouchableOpacity
            key={day.date}
            onPress={() => onDayPress(day)}
            accessibilityRole="button"
            testID={`calendar-day-${day.date}`}
          >
            <Text
              variant={isToday ? 'body-s-medium' : 'body-s-regular'}
              color={isToday ? 'accent' : 'textSecondary'}
            >
              {labels.day(day)}
            </Text>

            {(itemsByDate[day.date] ?? []).map(item => (
              <Box key={calendarItemKey(item)} marginTop="sm">
                <CalendarItemTile item={item} onWorkoutPress={onWorkoutPress} />
              </Box>
            ))}
          </TouchableOpacity>
        );
      })}
    </Box>
  );
}
