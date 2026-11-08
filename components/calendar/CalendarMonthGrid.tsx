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
import { type CalendarItemsByDate, calendarItemKey } from '@/lib/calendarItems';
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
/** A tile's padding, and the space between its day number and Note bars. */
const TILE_SPACING = 'xs';
const MARKER_SIZE = 6;
/**
 * An A Race's ring around its whole tile: a tile-sized outline, unlike any
 * dot.
 */
const A_RING_WIDTH = 2;
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
 * The monthly grid: Monday-first weeks of day tiles, filling the space it is
 * given — the rows share its height, so a 6-week month gets shorter tiles,
 * not a taller grid. Under each day number, its Notes as coloured bars (two
 * lanes; a multi-day Note runs as one bar across the tiles and the gaps
 * between them), a "+N" for the Notes that don't fit, then a marker per
 * item — a rank icon per Race in Race order, then a status dot per Workout
 * and a hollow green ring per Unplanned Activity ("done, not planned"). A
 * day with an A Race is ringed in red, past or future alike. A tile cuts off
 * what doesn't fit; the day sheet shows everything. Days from the
 * neighbouring months are dimmer tiles, empty and not tappable — their data
 * was never fetched.
 */
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

/**
 * A week of tiles, with the row's Note bars drawn over them in one layer so
 * a bar and its label run unbroken across tiles. Each tile reserves the
 * bars' height under its day number. The row clips too, so bars that don't
 * fit a short row stay out of the row below.
 */
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
        // Decoration only: the tile under it takes the tap and announces the
        // day's counts.
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            top:
              theme.spacing[TILE_SPACING] +
              DAY_NUMBER_SIZE +
              theme.spacing[TILE_SPACING],
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
        left: `${left.percent}%`,
        marginLeft: left.offset,
        right: `${right.percent}%`,
        marginRight: right.offset,
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
          {noteTitle(note)}
        </Text>
      </View>
    </View>
  );
}

interface GridCellProps {
  cell: CalendarGridCell;
  data: CalendarData;
  /** The height the row's Note bars take under the day number. */
  barsHeight: number;
  /** The "+N": the day's Notes that didn't fit a lane. */
  overflow: number;
  isToday: boolean;
  onDayPress: (day: CalendarDay) => void;
}

function GridCell({
  cell,
  data,
  barsHeight,
  overflow,
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
      <CalendarDayTile flex={1} padding={TILE_SPACING} overflow="hidden">
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
          <Box marginTop={TILE_SPACING} style={{ height: barsHeight }} />
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

        {races.length > 0 && (
          <Box
            flexDirection="row"
            flexWrap="wrap"
            alignItems="center"
            gap="xs"
            marginTop="xs"
          >
            {races.map(item => (
              <RaceRankIcon
                key={calendarItemKey(item)}
                priority={item.race.priority}
                size={RACE_RANKS[item.race.priority].gridIconSize}
              />
            ))}
          </Box>
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

        {hasARace && <ARaceRing />}
      </CalendarDayTile>
    </TouchableOpacity>
  );
}

/**
 * The red ring around a day with an A Race. Drawn over the tile's edge
 * rather than as its border, so the tile's content stays where every other
 * tile has it. Decoration only: the day's label says "wyścig A".
 */
function ARaceRing() {
  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      bottom={0}
      left={0}
      borderRadius="sm"
      borderWidth={A_RING_WIDTH}
      borderColor="race"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="calendar-a-race-ring"
    />
  );
}

/** The day's screen-reader label (see `formatDayLabel`). */
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

/** A day from a neighbouring month: a dimmer tile, empty, not tappable. */
function PaddingCell({ cell }: { cell: CalendarGridCell }) {
  return (
    <Box flex={1} testID={`calendar-day-${cell.date}`}>
      <CalendarDayTile
        outsideMonth
        flex={1}
        padding={TILE_SPACING}
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
