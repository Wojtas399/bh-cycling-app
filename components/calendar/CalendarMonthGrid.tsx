import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import CalendarDayTile, {
  TILE_GAP,
} from '@/components/calendar/CalendarDayTile';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import { RACE_RANKS } from '@/components/race/raceRanks';
import { useAppTheme } from '@/constants/theme';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import { useToday } from '@/hooks/useToday';
import { dayCounts, dayMarkers, formatDayLabel } from '@/lib/calendarDayCounts';
import {
  type CalendarDay,
  type CalendarGridCell,
  getMonthGrid,
} from '@/lib/calendarGrid';
import {
  type CalendarItemsByDate,
  type RaceItem,
  calendarItemKey,
} from '@/lib/calendarItems';
import {
  type CalendarData,
  eachDate,
  endOfMonth,
  startOfMonth,
} from '@/lib/calendarWorkouts';
import {
  type NoteBarSegment,
  type NoteRowLayout,
  layoutNoteRow,
  noteBarInsets,
} from '@/lib/noteBars';
import { noteFill, noteLabelColor } from '@/lib/noteColors';
import type { Note } from '@/lib/notes';

const DAY_NUMBER_SIZE = 24;
const TILE_PADDING_AND_BARS_GAP = 'xs';
const MARKER_SIZE = 6;
const A_RACE_RING_WIDTH = 2;
const BAR_HEIGHT = 14;
const BAR_GAP = 2;
const BAR_ROUNDED_END_INSET_FROM_CELL_EDGE = 3;
const DECORATION_LEAVING_TAP_AND_LABEL_TO_TILE = {
  pointerEvents: 'none',
  importantForAccessibility: 'no-hide-descendants',
  accessibilityElementsHidden: true,
} as const;
const BAR_LABEL_SIZE = 10;

export interface CalendarMonthGridProps {
  month: Date;
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
  onDayPress: (day: CalendarDay) => void;
}

export default function CalendarMonthGrid({
  month,
  itemsByDate,
  notes,
  onDayPress,
}: CalendarMonthGridProps) {
  const labels = useCalendarLabels();
  const today = useToday();
  const data = useMemo(() => ({ itemsByDate, notes }), [itemsByDate, notes]);
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
    <Box
      flex={1}
      paddingHorizontal="sm"
      paddingBottom="sm"
      testID="calendar-month-grid"
    >
      <Box flexDirection="row" marginBottom="sm" style={{ gap: TILE_GAP }}>
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

      <Box flex={1} style={{ gap: TILE_GAP }}>
        {rows.map(({ week, layout }) => (
          <GridRow
            key={week[0].date}
            week={week}
            layout={layout}
            data={data}
            today={today}
            onDayPress={onDayPress}
          />
        ))}
      </Box>
    </Box>
  );
}

interface GridRowProps {
  week: CalendarGridCell[];
  layout: NoteRowLayout;
  data: CalendarData;
  today: string;
  onDayPress: (day: CalendarDay) => void;
}

function GridRow({ week, layout, data, today, onDayPress }: GridRowProps) {
  const theme = useAppTheme();
  const laneCount = Math.max(0, ...layout.segments.map(s => s.lane + 1));
  const barsHeight =
    laneCount > 0 ? laneCount * BAR_HEIGHT + (laneCount - 1) * BAR_GAP : 0;

  return (
    <Box
      flex={1}
      flexDirection="row"
      overflow="hidden"
      style={{ gap: TILE_GAP }}
    >
      {week.map(cell =>
        cell.inMonth ? (
          <GridCell
            key={cell.date}
            cell={cell}
            data={data}
            rowNoteBarsHeight={barsHeight}
            hiddenNoteCount={layout.overflowByDate[cell.date] ?? 0}
            isToday={cell.date === today}
            onDayPress={onDayPress}
          />
        ) : (
          <NeighbouringMonthCell key={cell.date} cell={cell} />
        ),
      )}

      {layout.segments.length > 0 && (
        <View
          {...DECORATION_LEAVING_TAP_AND_LABEL_TO_TILE}
          style={{
            position: 'absolute',
            top:
              theme.spacing[TILE_PADDING_AND_BARS_GAP] +
              DAY_NUMBER_SIZE +
              theme.spacing[TILE_PADDING_AND_BARS_GAP],
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

function NoteBar({ segment }: { segment: NoteBarSegment }) {
  const { note, lane, roundedStart, roundedEnd } = segment;
  const noteTitle = useNoteTitle();
  const theme = useAppTheme();
  const radius = theme.borderRadii.sm;
  const { left, right } = noteBarInsets(segment, TILE_GAP);

  return (
    <View
      style={{
        position: 'absolute',
        top: lane * (BAR_HEIGHT + BAR_GAP),
        left: `${left.percentOfRow}%`,
        marginLeft: left.offsetPoints,
        right: `${right.percentOfRow}%`,
        marginRight: right.offsetPoints,
        height: BAR_HEIGHT,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: noteFill(note.color),
          marginLeft: roundedStart ? BAR_ROUNDED_END_INSET_FROM_CELL_EDGE : 0,
          marginRight: roundedEnd ? BAR_ROUNDED_END_INSET_FROM_CELL_EDGE : 0,
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
            paddingHorizontal: BAR_ROUNDED_END_INSET_FROM_CELL_EDGE,
          }}
        >
          {noteTitle(note)}
        </Text>
      </View>
    </View>
  );
}

interface GridCellProps {
  cell: CalendarGridCell;
  data: CalendarData;
  rowNoteBarsHeight: number;
  hiddenNoteCount: number;
  isToday: boolean;
  onDayPress: (day: CalendarDay) => void;
}

function GridCell({
  cell,
  data,
  rowNoteBarsHeight,
  hiddenNoteCount,
  isToday,
  onDayPress,
}: GridCellProps) {
  const { races, markers, hasARace } = dayMarkers(
    data.itemsByDate[cell.date] ?? [],
  );
  const label = useDayLabel(cell, data);

  return (
    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={() => onDayPress(cell)}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={`calendar-day-${cell.date}`}
    >
      <CalendarDayTile
        flex={1}
        padding={TILE_PADDING_AND_BARS_GAP}
        overflow="hidden"
      >
        <Box flexDirection="row" alignItems="center" gap="xs">
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

          {races.length > 0 && <RankIconsBesideDayNumber races={races} />}
        </Box>

        {rowNoteBarsHeight > 0 && (
          <Box
            marginTop={TILE_PADDING_AND_BARS_GAP}
            style={{ height: rowNoteBarsHeight }}
          />
        )}

        {hiddenNoteCount > 0 && (
          <Text
            variant="body-xs-regular"
            color="textSecondary"
            style={{ fontSize: BAR_LABEL_SIZE, lineHeight: BAR_HEIGHT }}
          >
            +{hiddenNoteCount}
          </Text>
        )}

        {markers.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" gap="xs" marginTop="xs">
            {markers.map(item =>
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

        {hasARace && <ARaceRingOverTileEdge />}
      </CalendarDayTile>
    </TouchableOpacity>
  );
}

function RankIconsBesideDayNumber({ races }: { races: RaceItem[] }) {
  return (
    <Box
      flex={1}
      flexDirection="row"
      alignItems="center"
      gap="xs"
      overflow="hidden"
    >
      {races.map(item => (
        <RaceRankIcon
          key={calendarItemKey(item)}
          priority={item.race.priority}
          size={RACE_RANKS[item.race.priority].gridIconSize}
        />
      ))}
    </Box>
  );
}

function ARaceRingOverTileEdge() {
  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      bottom={0}
      left={0}
      borderRadius="sm"
      borderWidth={A_RACE_RING_WIDTH}
      borderColor="race"
      {...DECORATION_LEAVING_TAP_AND_LABEL_TO_TILE}
      testID="calendar-a-race-ring"
    />
  );
}

function useDayLabel(cell: CalendarGridCell, data: CalendarData): string {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.dayCounts' });
  const labels = useCalendarLabels();

  return formatDayLabel(labels.day(cell), dayCounts(data, cell.date), {
    race: priority => t('race', { priority }),
    races: (count, priorities) => t('races', { count, priorities }),
    workouts: count => t('workouts', { count }),
    activities: count => t('activities', { count }),
    notes: count => t('notes', { count }),
  });
}

function NeighbouringMonthCell({ cell }: { cell: CalendarGridCell }) {
  return (
    <Box flex={1} testID={`calendar-day-${cell.date}`}>
      <CalendarDayTile
        outsideMonth
        flex={1}
        padding={TILE_PADDING_AND_BARS_GAP}
        overflow="hidden"
      >
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
      </CalendarDayTile>
    </Box>
  );
}
