import type { ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useToday } from '@/hooks/useToday';
import {
  type CalendarDay,
  type CalendarGridCell,
  getMonthGrid,
} from '@/lib/calendarGrid';
import {
  type CalendarItem,
  type CalendarItemsByDate,
  calendarItemKey,
} from '@/lib/calendarItems';

const DAY_NUMBER_SIZE = 32;
const CELL_MIN_HEIGHT = 52;
const MARKER_SIZE = 6;

export interface CalendarMonthGridProps {
  /** Any date in the month to lay out. */
  month: Date;
  itemsByDate: CalendarItemsByDate;
  onDayPress: (day: CalendarDay) => void;
}

/**
 * The monthly grid: Monday-first weeks with a marker per item under each
 * day — a status dot per Workout, a hollow green ring per Unplanned Activity
 * ("done, not planned"). Days from the neighbouring months are dimmed, dot-less, and not
 * tappable — their data was never fetched.
 */
export default function CalendarMonthGrid({
  month,
  itemsByDate,
  onDayPress,
}: CalendarMonthGridProps) {
  const labels = useCalendarLabels();
  const today = useToday();

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
          {week.map(cell =>
            cell.inMonth ? (
              <GridCell
                key={cell.date}
                cell={cell}
                items={itemsByDate[cell.date] ?? []}
                isToday={cell.date === today}
                onDayPress={onDayPress}
              />
            ) : (
              <PaddingCell key={cell.date} cell={cell} />
            ),
          )}
        </Box>
      ))}
    </Box>
  );
}

interface GridCellProps {
  cell: CalendarGridCell;
  items: CalendarItem[];
  isToday: boolean;
  onDayPress: (day: CalendarDay) => void;
}

function GridCell({ cell, items, isToday, onDayPress }: GridCellProps) {
  return (
    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={() => onDayPress(cell)}
      accessibilityRole="button"
      testID={`calendar-day-${cell.date}`}
    >
      <CellFrame>
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
            color={isToday ? 'textInverse' : 'textPrimary'}
          >
            {cell.dayOfMonth}
          </Text>
        </Box>

        {items.length > 0 && (
          <Box
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="center"
            gap="xs"
            marginTop="xs"
          >
            {items.map(item =>
              item.kind === 'workout' ? (
                <WorkoutStatusDot
                  key={calendarItemKey(item)}
                  status={item.workout.status}
                  size={MARKER_SIZE}
                />
              ) : (
                <Box
                  key={calendarItemKey(item)}
                  width={MARKER_SIZE}
                  height={MARKER_SIZE}
                  borderRadius="full"
                  borderWidth={1}
                  borderColor="workoutDone"
                  testID="unplanned-activity-ring"
                />
              ),
            )}
          </Box>
        )}
      </CellFrame>
    </TouchableOpacity>
  );
}

/** A day from a neighbouring month: dimmed, dot-less, not tappable. */
function PaddingCell({ cell }: { cell: CalendarGridCell }) {
  return (
    <Box flex={1} testID={`calendar-day-${cell.date}`}>
      <CellFrame>
        <Box
          width={DAY_NUMBER_SIZE}
          height={DAY_NUMBER_SIZE}
          alignItems="center"
          justifyContent="center"
        >
          <Text variant="body-s-regular" color="textTertiary">
            {cell.dayOfMonth}
          </Text>
        </Box>
      </CellFrame>
    </Box>
  );
}

function CellFrame({ children }: { children: ReactNode }) {
  return (
    <Box
      alignItems="center"
      paddingVertical="xs"
      style={{ minHeight: CELL_MIN_HEIGHT }}
    >
      {children}
    </Box>
  );
}
