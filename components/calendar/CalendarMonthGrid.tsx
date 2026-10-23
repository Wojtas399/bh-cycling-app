import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useAppTheme } from '@/constants/theme';
import { useToday } from '@/hooks/useToday';
import { dayCounts } from '@/lib/calendarDayCounts';
import {
  type CalendarDay,
  type CalendarGridCell,
  getMonthGrid,
} from '@/lib/calendarGrid';
import { type CalendarItemsByDate, calendarItemKey } from '@/lib/calendarItems';
import { eachDate, endOfMonth, startOfMonth } from '@/lib/calendarWorkouts';
import {
  type NoteBarSegment,
  type NoteRowLayout,
  layoutNoteRow,
} from '@/lib/noteBars';
import { noteFill, noteLabelColor } from '@/lib/noteColors';
import type { Note } from '@/lib/notes';

const DAY_NUMBER_SIZE = 32;
const CELL_MIN_HEIGHT = 52;
const MARKER_SIZE = 6;
const BAR_HEIGHT = 14;
const BAR_GAP = 2;
/** How far a bar's rounded end sits in from its cell's edge. */
const BAR_END_INSET = 3;
const BAR_LABEL_SIZE = 10;

export interface CalendarMonthGridProps {
  /** Any date in the month to lay out. */
  month: Date;
  itemsByDate: CalendarItemsByDate;
  /** The whole Notes overlapping the month, in `id` order. */
  notes: Note[];
  onDayPress: (day: CalendarDay) => void;
}

/**
 * The monthly grid: Monday-first weeks. Under each day number, its Notes as
 * coloured bars (two lanes; a multi-day Note runs as one bar across the
 * cells), a "+N" for the Notes that don't fit, then a marker per item — a
 * status dot per Workout, a hollow green ring per Unplanned Activity ("done,
 * not planned"). Days from the neighbouring months are dimmed, empty, and
 * not tappable — their data was never fetched.
 */
export default function CalendarMonthGrid({
  month,
  itemsByDate,
  notes,
  onDayPress,
}: CalendarMonthGridProps) {
  const labels = useCalendarLabels();
  const today = useToday();
  const rows = useMemo(() => {
    const monthDates = eachDate(startOfMonth(month), endOfMonth(month));

    return getMonthGrid(month).map(week => ({
      week,
      layout: layoutNoteRow(
        week.map(cell => cell.date),
        monthDates,
        notes,
      ),
    }));
  }, [month, notes]);

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

      {rows.map(({ week, layout }) => (
        <GridRow
          key={week[0].date}
          week={week}
          layout={layout}
          itemsByDate={itemsByDate}
          notes={notes}
          today={today}
          onDayPress={onDayPress}
        />
      ))}
    </Box>
  );
}

interface GridRowProps {
  week: CalendarGridCell[];
  layout: NoteRowLayout;
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
  today: string;
  onDayPress: (day: CalendarDay) => void;
}

/**
 * A week of cells, with the row's Note bars drawn over them in one layer so
 * a bar and its label run unbroken across cells. Each cell reserves the
 * bars' height under its day number.
 */
function GridRow({
  week,
  layout,
  itemsByDate,
  notes,
  today,
  onDayPress,
}: GridRowProps) {
  const theme = useAppTheme();
  const laneCount = Math.max(0, ...layout.segments.map(s => s.lane + 1));
  const barsHeight =
    laneCount > 0 ? laneCount * BAR_HEIGHT + (laneCount - 1) * BAR_GAP : 0;

  return (
    <Box flexDirection="row">
      {week.map(cell =>
        cell.inMonth ? (
          <GridCell
            key={cell.date}
            cell={cell}
            itemsByDate={itemsByDate}
            notes={notes}
            barsHeight={barsHeight}
            overflow={layout.overflowByDate[cell.date] ?? 0}
            isToday={cell.date === today}
            onDayPress={onDayPress}
          />
        ) : (
          <PaddingCell key={cell.date} cell={cell} />
        ),
      )}

      {layout.segments.length > 0 && (
        // Decoration only: the cell under it takes the tap and announces
        // the day's counts.
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            top: theme.spacing.xs + DAY_NUMBER_SIZE + theme.spacing.xs,
            left: 0,
            right: 0,
          }}
        >
          {layout.segments.map(segment => (
            <NoteBar key={segment.note.id} segment={segment} />
          ))}
        </View>
      )}
    </Box>
  );
}

function NoteBar({
  segment: { note, lane, firstColumn, lastColumn, roundedStart, roundedEnd },
}: {
  segment: NoteBarSegment;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const theme = useAppTheme();
  const radius = theme.borderRadii.sm;

  return (
    <View
      style={{
        position: 'absolute',
        top: lane * (BAR_HEIGHT + BAR_GAP),
        left: `${(firstColumn / 7) * 100}%`,
        width: `${((lastColumn - firstColumn + 1) / 7) * 100}%`,
        height: BAR_HEIGHT,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: noteFill(note.color),
          marginLeft: roundedStart ? BAR_END_INSET : 0,
          marginRight: roundedEnd ? BAR_END_INSET : 0,
          borderTopLeftRadius: roundedStart ? radius : 0,
          borderBottomLeftRadius: roundedStart ? radius : 0,
          borderTopRightRadius: roundedEnd ? radius : 0,
          borderBottomRightRadius: roundedEnd ? radius : 0,
        }}
      >
        <Text
          variant="body-xs-medium"
          numberOfLines={1}
          style={{
            color: noteLabelColor(note.color),
            fontSize: BAR_LABEL_SIZE,
            lineHeight: BAR_HEIGHT,
            paddingHorizontal: BAR_END_INSET,
          }}
        >
          {note.name ?? t('untitled')}
        </Text>
      </View>
    </View>
  );
}

interface GridCellProps {
  cell: CalendarGridCell;
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
  /** The height the row's Note bars take under the day number. */
  barsHeight: number;
  /** The "+N": the day's Notes that didn't fit a lane. */
  overflow: number;
  isToday: boolean;
  onDayPress: (day: CalendarDay) => void;
}

function GridCell({
  cell,
  itemsByDate,
  notes,
  barsHeight,
  overflow,
  isToday,
  onDayPress,
}: GridCellProps) {
  const items = itemsByDate[cell.date] ?? [];
  const label = useDayLabel(cell, itemsByDate, notes);

  return (
    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={() => onDayPress(cell)}
      accessibilityRole="button"
      accessibilityLabel={label}
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

        {barsHeight > 0 && (
          <Box marginTop="xs" style={{ height: barsHeight }} />
        )}

        {overflow > 0 && (
          <Text
            variant="body-xs-regular"
            color="textSecondary"
            style={{ fontSize: BAR_LABEL_SIZE, lineHeight: BAR_HEIGHT }}
          >
            +{overflow}
          </Text>
        )}

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

/**
 * "Poniedziałek, 5 października. 2 treningi, 1 aktywność, 3 notatki" — the
 * day and what it holds, zero counts left out.
 */
function useDayLabel(
  cell: CalendarGridCell,
  itemsByDate: CalendarItemsByDate,
  notes: Note[],
): string {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.dayCounts' });
  const labels = useCalendarLabels();
  const counts = dayCounts({ itemsByDate, notes }, cell.date);
  const parts = [
    counts.workouts > 0 && t('workouts', { count: counts.workouts }),
    counts.activities > 0 && t('activities', { count: counts.activities }),
    counts.notes > 0 && t('notes', { count: counts.notes }),
  ].filter(part => typeof part === 'string');
  const day = labels.day(cell);

  return parts.length > 0 ? `${day}. ${parts.join(', ')}` : day;
}

/** A day from a neighbouring month: dimmed, empty, not tappable. */
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
