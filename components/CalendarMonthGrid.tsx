import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import { useCalendarLabels } from '@/hooks/useCalendarLabels';
import {
  type CalendarDay,
  type CalendarGridCell,
  getMonthGrid,
} from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

const DAY_NUMBER_SIZE = 32;

export interface CalendarMonthGridProps {
  /** Any date in the month to lay out. */
  month: Date;
  workoutsByDate: Record<string, CalendarWorkout[]>;
  /** Local `YYYY-MM-DD` of today, highlighted when it falls in the grid. */
  today: string;
  onDayPress: (day: CalendarDay) => void;
}

/**
 * The monthly grid: Monday-first weeks with a status dot per workout under
 * each day. Days from the neighbouring months are dimmed, dot-less, and not
 * tappable — their data was never fetched.
 */
export default function CalendarMonthGrid({
  month,
  workoutsByDate,
  today,
  onDayPress,
}: CalendarMonthGridProps) {
  const labels = useCalendarLabels();

  return (
    <Box testID="calendar-month-grid">
      <Box flexDirection="row" marginBottom="sm">
        {labels.weekdaysShort.map(weekday => (
          <Text
            key={weekday}
            variant="body-xs-medium"
            color="textSecondary"
            textAlign="center"
            style={{ flex: 1 }}
          >
            {weekday}
          </Text>
        ))}
      </Box>

      {getMonthGrid(month).map(week => (
        <Box key={week[0].date} flexDirection="row">
          {week.map(cell => (
            <GridCell
              key={cell.date}
              cell={cell}
              workouts={workoutsByDate[cell.date] ?? []}
              isToday={cell.date === today}
              onDayPress={onDayPress}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

interface GridCellProps {
  cell: CalendarGridCell;
  workouts: CalendarWorkout[];
  isToday: boolean;
  onDayPress: (day: CalendarDay) => void;
}

function GridCell({ cell, workouts, isToday, onDayPress }: GridCellProps) {
  const content = (
    <Box alignItems="center" paddingVertical="xs" style={{ minHeight: 52 }}>
      <Box
        width={DAY_NUMBER_SIZE}
        height={DAY_NUMBER_SIZE}
        borderRadius="full"
        alignItems="center"
        justifyContent="center"
        backgroundColor={isToday ? 'interactiveDefault' : 'transparent'}
        testID={isToday ? 'calendar-today' : undefined}
      >
        <Text
          variant={isToday ? 'body-s-medium' : 'body-s-regular'}
          color={
            isToday
              ? 'textInverse'
              : cell.inMonth
                ? 'textPrimary'
                : 'textTertiary'
          }
        >
          {cell.dayOfMonth}
        </Text>
      </Box>

      {cell.inMonth && workouts.length > 0 && (
        <Box
          flexDirection="row"
          flexWrap="wrap"
          justifyContent="center"
          gap="xs"
          marginTop="xs"
        >
          {workouts.map(workout => (
            <WorkoutStatusDot key={workout.id} status={workout.status} />
          ))}
        </Box>
      )}
    </Box>
  );

  if (!cell.inMonth) {
    return (
      <Box flex={1} testID={`calendar-day-${cell.date}`}>
        {content}
      </Box>
    );
  }

  return (
    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={() => onDayPress(cell)}
      accessibilityRole="button"
      testID={`calendar-day-${cell.date}`}
    >
      {content}
    </TouchableOpacity>
  );
}
