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
const CELL_MIN_HEIGHT = 52;

export interface CalendarMonthGridProps {
  /** Any date in the month to lay out. */
  anchor: Date;
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
  anchor,
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

      {getMonthGrid(anchor).map(week => (
        <Box key={week[0].date} flexDirection="row">
          {week.map(cell => (
            <GridCell
              key={cell.date}
              cell={cell}
              workouts={workoutsByDate[cell.date] ?? []}
              isToday={cell.inMonth && cell.date === today}
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

const CELL_VARIANTS = {
  today: {
    textVariant: 'body-s-medium',
    textColor: 'textInverse',
    backgroundColor: 'interactiveDefault',
  },
  inMonth: {
    textVariant: 'body-s-regular',
    textColor: 'textPrimary',
    backgroundColor: 'transparent',
  },
  padding: {
    textVariant: 'body-s-regular',
    textColor: 'textTertiary',
    backgroundColor: 'transparent',
  },
} as const;

function GridCell({ cell, workouts, isToday, onDayPress }: GridCellProps) {
  const variant =
    CELL_VARIANTS[isToday ? 'today' : cell.inMonth ? 'inMonth' : 'padding'];

  return (
    <TouchableOpacity
      style={{ flex: 1 }}
      disabled={!cell.inMonth}
      onPress={() => onDayPress(cell)}
      accessibilityRole={cell.inMonth ? 'button' : undefined}
      testID={`calendar-day-${cell.date}`}
    >
      <Box
        alignItems="center"
        paddingVertical="xs"
        style={{ minHeight: CELL_MIN_HEIGHT }}
      >
        <Box
          width={DAY_NUMBER_SIZE}
          height={DAY_NUMBER_SIZE}
          borderRadius="full"
          alignItems="center"
          justifyContent="center"
          backgroundColor={variant.backgroundColor}
          testID={isToday ? 'calendar-today' : undefined}
        >
          <Text variant={variant.textVariant} color={variant.textColor}>
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
    </TouchableOpacity>
  );
}
