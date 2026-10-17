import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useToday } from '@/hooks/useToday';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarWeekAgendaProps {
  /** Any date in the week to lay out. */
  week: Date;
  workoutsByDate: Record<string, CalendarWorkout[]>;
  onDayPress: (day: CalendarDay) => void;
  onWorkoutPress: (workout: CalendarWorkout) => void;
}

/**
 * The weekly agenda: Monday to Sunday, each day's label followed by a card
 * per workout. Rest days show the label alone. Tapping a card opens that
 * Workout; tapping elsewhere in the day opens the day sheet.
 */
export default function CalendarWeekAgenda({
  week,
  workoutsByDate,
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

            {(workoutsByDate[day.date] ?? []).map(workout => (
              <Box key={workout.id} marginTop="sm">
                <WorkoutTile
                  title={workout.name}
                  status={workout.status}
                  durationSeconds={workout.durationSeconds}
                  blocks={workout.blocks}
                  onPress={() => onWorkoutPress(workout)}
                />
              </Box>
            ))}
          </TouchableOpacity>
        );
      })}
    </Box>
  );
}
