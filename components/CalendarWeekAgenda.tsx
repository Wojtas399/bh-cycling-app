import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useCalendarLabels } from '@/hooks/useCalendarLabels';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarWeekAgendaProps {
  /** Any date in the week to lay out. */
  anchor: Date;
  workoutsByDate: Record<string, CalendarWorkout[]>;
  /** Local `YYYY-MM-DD` of today, highlighted when it falls in the week. */
  today: string;
  onDayPress: (day: CalendarDay) => void;
}

/**
 * The weekly agenda: Monday to Sunday, each day's label followed by a card
 * per workout. Rest days show the label alone.
 */
export default function CalendarWeekAgenda({
  anchor,
  workoutsByDate,
  today,
  onDayPress,
}: CalendarWeekAgendaProps) {
  const labels = useCalendarLabels();

  return (
    <Box testID="calendar-week-agenda" gap="base">
      {getWeekDays(anchor).map(day => {
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
                />
              </Box>
            ))}
          </TouchableOpacity>
        );
      })}
    </Box>
  );
}
