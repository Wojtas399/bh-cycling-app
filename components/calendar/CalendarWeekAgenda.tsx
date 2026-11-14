import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import { useAppTheme } from '@/constants/theme';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import { useToday } from '@/hooks/useToday';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import {
  type CalendarItem,
  type CalendarItemsByDate,
  type UnplannedActivity,
  calendarItemKey,
} from '@/lib/calendarItems';
import {
  type CompactItemRow,
  type CompactItemRowWords,
  compactItemRow,
  compactItemRowLabel,
} from '@/lib/compactItemRow';
import { formatDuration, formatSpokenDuration } from '@/lib/formatDuration';
import { noteFill } from '@/lib/noteColors';
import { formatNoteRange, formatNoteShortRange } from '@/lib/noteDates';
import type { Note } from '@/lib/notes';
import type { Race } from '@/lib/races';
import { type LaneCrossing, type NoteRow, weekNotes } from '@/lib/weekNotes';
import type { CalendarWorkout } from '@/lib/workoutStatus';

const RAIL_WIDTH = 44;
/** Above and below a day's rows; the rail runs through it. */
const DAY_PADDING = 'md';
/** Today's filled square behind the day number. */
const DAY_NUMBER_BOX = { width: 40, height: 36 };
/** Every row is at least a comfortable tap target tall. */
const ROW_MIN_HEIGHT = 44;
const MINI_PROFILE = { width: 54, height: 14 };
const MARKER_SIZE = 8;
/** A multi-day Note's line beside the rail, and the gap after it. */
const LANE_WIDTH = 3;
const LANE_GAP = 3;
/** How far inside the day a line starts or ends on its Note's real day. */
const LANE_INSET = 14;

export interface CalendarWeekAgendaProps {
  /** Any date in the week to lay out. */
  week: Date;
  itemsByDate: CalendarItemsByDate;
  /** The Notes overlapping the week, in `id` order. */
  notes: Note[];
  onDayPress: (day: CalendarDay) => void;
  onWorkoutPress: (workout: CalendarWorkout) => void;
  onActivityPress: (activity: UnplannedActivity) => void;
  onRacePress: (race: Race) => void;
  onNotePress: (note: Note) => void;
}

type ItemPressHandlers = Pick<
  CalendarWeekAgendaProps,
  'onWorkoutPress' | 'onActivityPress' | 'onRacePress'
>;

/**
 * The weekly agenda as a date rail: Monday to Sunday, each day its rail
 * (short weekday over the day number, today on a white square) beside its
 * rows — its Note rows (see `weekNotes`), a "+N notatki" row for the ones
 * past the cap, then one compact row per item (the day's Races first, then
 * its Workouts and Unplanned Activities) or a muted "Odpoczynek" on a day
 * with none. A hairline parts the rows and the days. A multi-day Note is a
 * line in its colour, in its own lane between the screen edge and the rail,
 * down every day it covers. Tapping a Note row opens the Note, an item row
 * opens its item, and tapping the rail, "+N notatki" or anywhere else in the
 * day, a Strava Activity's row included, opens the day sheet.
 */
export default function CalendarWeekAgenda({
  week,
  itemsByDate,
  notes,
  onDayPress,
  onNotePress,
  ...handlers
}: CalendarWeekAgendaProps) {
  const labels = useCalendarLabels();
  const today = useToday();
  const days = getWeekDays(week);
  const layout = weekNotes(
    notes,
    days.map(day => day.date),
  );

  return (
    <Box testID="calendar-week-agenda">
      {days.map((day, index) => {
        const {
          crossings,
          rows: noteRows,
          hiddenCount,
        } = layout.days[day.date];
        const items = itemsByDate[day.date] ?? [];
        const rows: ReactElement[] = [
          ...noteRows.map(row => (
            <NoteRowButton
              key={`note-${row.note.id}`}
              row={row}
              when={
                row.multiDay
                  ? formatNoteRange(row.note, labels.monthNamesGenitive)
                  : labels.day(day)
              }
              onPress={() => onNotePress(row.note)}
            />
          )),
          ...(hiddenCount > 0
            ? [
                <MoreNotesRow
                  key="more-notes"
                  count={hiddenCount}
                  onPress={() => onDayPress(day)}
                />,
              ]
            : []),
          ...(items.length > 0
            ? items.map(item => (
                <ItemRow
                  key={calendarItemKey(item)}
                  item={item}
                  {...handlers}
                />
              ))
            : [<RestRow key="rest" />]),
        ];

        return (
          <TouchableOpacity
            key={day.date}
            onPress={() => onDayPress(day)}
            // Not one grouped element, so a screen reader reaches the rail
            // and every row inside on its own.
            accessible={false}
            testID={`calendar-day-${day.date}`}
          >
            <Box
              flexDirection="row"
              paddingVertical={DAY_PADDING}
              borderTopWidth={index === 0 ? 0 : 1}
              borderColor="hairline"
            >
              <NoteLanes
                laneCount={layout.lanes.length}
                crossings={crossings}
              />

              <DateRail
                day={day}
                isToday={day.date === today}
                onPress={() => onDayPress(day)}
              />

              <Box flex={1} minWidth={0} marginLeft="md">
                {rows.map((row, i) => (
                  <Box
                    key={row.key}
                    borderTopWidth={i === 0 ? 0 : 1}
                    borderColor="hairline"
                  >
                    {row}
                  </Box>
                ))}
              </Box>
            </Box>
          </TouchableOpacity>
        );
      })}
    </Box>
  );
}

interface NoteLanesProps {
  /** The week's lane count, so every day's strip is as wide. */
  laneCount: number;
  crossings: LaneCrossing[];
}

/**
 * A day's strip of Note lanes between the screen edge and the rail: a line
 * per multi-day Note crossing the day, in its lane. A line starts or ends
 * inside the day on its Note's real first or last day, and otherwise runs to
 * the day's hairline, so it reads as one line down the week. Hidden from the
 * screen reader: each Note is announced once, by its title row.
 */
function NoteLanes({ laneCount, crossings }: NoteLanesProps) {
  const { spacing } = useAppTheme();

  if (laneCount === 0) return null;

  return (
    <Box
      width={laneCount * (LANE_WIDTH + LANE_GAP)}
      // Runs to the day's hairlines, past its padding, like the rail.
      style={{ marginVertical: -spacing[DAY_PADDING] }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {crossings.map(({ note, lane, starts, ends }) => (
        <Box
          key={note.id}
          position="absolute"
          width={LANE_WIDTH}
          borderRadius="full"
          style={{
            left: lane * (LANE_WIDTH + LANE_GAP),
            top: starts ? LANE_INSET : 0,
            bottom: ends ? LANE_INSET : 0,
            backgroundColor: noteFill(note.color),
          }}
        />
      ))}
    </Box>
  );
}

interface DateRailProps {
  day: CalendarDay;
  isToday: boolean;
  onPress: () => void;
}

/**
 * A day's rail: its uppercase short weekday over the day number, today's on a
 * white filled square. To a screen reader it's the day's heading, so the
 * athlete can jump day to day, and double-tapping it opens the day sheet.
 */
function DateRail({ day, isToday, onPress }: DateRailProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });
  const { colors, spacing } = useAppTheme();
  const labels = useCalendarLabels();
  const dayLabel = labels.day(day);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="header"
      accessibilityLabel={isToday ? t('today', { day: dayLabel }) : dayLabel}
      accessibilityHint={t('opensDay')}
      style={{
        width: RAIL_WIDTH,
        alignItems: 'center',
        // Runs to the day's hairlines, past its padding, so the whole height
        // of the rail opens the day sheet.
        marginVertical: -spacing[DAY_PADDING],
        paddingVertical: spacing[DAY_PADDING],
      }}
    >
      <Text
        variant="body-xs-medium"
        color={isToday ? 'textPrimary' : 'textSecondary'}
        style={{ letterSpacing: 0.5 }}
      >
        {labels.weekdaysShort[day.weekday].toUpperCase()}
      </Text>
      <Box
        marginTop="xs"
        width={DAY_NUMBER_BOX.width}
        height={DAY_NUMBER_BOX.height}
        alignItems="center"
        justifyContent="center"
        borderRadius="lg"
        style={
          isToday ? { backgroundColor: colors.interactiveDefault } : undefined
        }
      >
        <Text variant="h2" color={isToday ? 'textInverse' : 'textPrimary'}>
          {day.dayOfMonth}
        </Text>
      </Box>
    </Pressable>
  );
}

/** A day with no items: plain muted text, so a tap reaches the day sheet. */
function RestRow() {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });

  return (
    <Box minHeight={ROW_MIN_HEIGHT} justifyContent="center">
      <Text variant="body-s-regular" color="textTertiary">
        {t('rest')}
      </Text>
    </Box>
  );
}

interface ItemRowProps extends ItemPressHandlers {
  item: CalendarItem;
}

/**
 * One item on one line: its marker, title, a Workout's mini profile, a Race's
 * priority tag, then its duration and load. The title is what truncates. Read
 * as one stop, by `compactItemRowLabel`. It opens its item like the cards do:
 * a paired Race opens its Activity, and a Strava Activity's row isn't a
 * button, so a tap on it reaches the day sheet.
 */
function ItemRow({ item, ...handlers }: ItemRowProps) {
  const { t } = useTranslation();
  const words = useCompactRowWords();
  const row = compactItemRow(item, t('common.stravaActivity'));
  const label = compactItemRowLabel(row, words);
  const onPress = itemPress(item, handlers);
  const content = <ItemRowContent row={row} />;

  if (!onPress) {
    return (
      <Box
        accessible
        accessibilityLabel={label}
        minHeight={ROW_MIN_HEIGHT}
        justifyContent="center"
      >
        {content}
      </Box>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        minHeight: ROW_MIN_HEIGHT,
        justifyContent: 'center',
      })}
    >
      {content}
    </Pressable>
  );
}

/** What tapping an item's row opens; nothing for a Strava Activity. */
function itemPress(
  item: CalendarItem,
  { onWorkoutPress, onActivityPress, onRacePress }: ItemPressHandlers,
): (() => void) | undefined {
  switch (item.kind) {
    case 'workout':
      return () => onWorkoutPress(item.workout);
    case 'race': {
      const { race, activity } = item;

      return activity
        ? () => onActivityPress(activity)
        : () => onRacePress(race);
    }
    case 'activity': {
      const { activity } = item;

      return activity.isStravaActivity
        ? undefined
        : () => onActivityPress(activity);
    }
  }
}

function ItemRowContent({ row }: { row: CompactItemRow }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });
  const load = row.kind === 'workout' ? undefined : row.load;
  const figures = [
    ...(row.durationSeconds === undefined
      ? []
      : [formatDuration(row.durationSeconds)]),
    ...(load === undefined ? [] : [t('load', { load })]),
  ];

  return (
    <Box flexDirection="row" alignItems="center">
      <RowMarker row={row} />
      <Text
        variant={
          row.kind === 'race' && row.priority === 'A'
            ? 'body-l-semibold'
            : 'body-s-medium'
        }
        numberOfLines={1}
        marginLeft="sm"
        style={{ flex: 1 }}
      >
        {row.title}
      </Text>
      {row.kind === 'workout' && row.blocks.length > 0 && (
        <Box
          width={MINI_PROFILE.width}
          marginLeft="sm"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <WorkoutProfile blocks={row.blocks} height={MINI_PROFILE.height} />
        </Box>
      )}
      {row.kind === 'race' && <PriorityTag priority={row.priority} />}
      {figures.length > 0 && (
        <Text
          variant="body-xs-regular"
          color="textSecondary"
          marginLeft="sm"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {figures.join(' · ')}
        </Text>
      )}
    </Box>
  );
}

/**
 * The row's marker: a Workout's status dot, an Activity's ring, or a Race's
 * rank icon, after the done dot when it's paired.
 */
function RowMarker({ row }: { row: CompactItemRow }) {
  switch (row.kind) {
    case 'workout':
      return <WorkoutStatusDot status={row.status} size={MARKER_SIZE} />;
    case 'activity':
      return <ActivityRing />;
    case 'race':
      return (
        <Box flexDirection="row" alignItems="center" gap="xs">
          {row.paired && (
            <WorkoutStatusDot status="completed" size={MARKER_SIZE} />
          )}
          <RaceRankIcon priority={row.priority} size={14} />
        </Box>
      );
  }
}

/** An Unplanned Activity's marker: a ring where a Workout has its dot. */
function ActivityRing() {
  return (
    <Box
      width={MARKER_SIZE}
      height={MARKER_SIZE}
      borderRadius="full"
      borderColor="textSecondary"
      style={{ borderWidth: 1.5 }}
    />
  );
}

/** A Race's priority as a small red-outlined tag: "B". */
function PriorityTag({ priority }: { priority: Race['priority'] }) {
  return (
    <Box
      marginLeft="sm"
      borderWidth={1}
      borderColor="race"
      borderRadius="sm"
      paddingHorizontal="xs"
    >
      <Text variant="body-xs-medium" color="race">
        {priority}
      </Text>
    </Box>
  );
}

/** The Polish words a row's screen-reader label is built from. */
function useCompactRowWords(): CompactItemRowWords {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });

  return useMemo(
    () => ({
      workout: status => t(`workout.${status}`),
      activity: t('activity'),
      race: (priority, paired) =>
        t(paired ? 'racePaired' : 'race', { priority }),
      duration: seconds =>
        formatSpokenDuration(seconds, {
          hours: hours => t('hours', { hours }),
          minutes: minutes => t('minutes', { minutes }),
        }),
      load: load => t('loadSpoken', { load }),
    }),
    [t],
  );
}

interface NoteRowButtonProps {
  row: NoteRow;
  /** When the Note applies, as a screen reader announces it. */
  when: string;
  onPress: () => void;
}

/**
 * A Note's row: a multi-day Note's title in its colour and its short range
 * (the lane beside the rail is its marker), or a single-day Note's dot in its
 * colour and its title.
 */
function NoteRowButton({
  row: { note, multiDay },
  when,
  onPress,
}: NoteRowButtonProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const noteTitle = useNoteTitle();
  const title = noteTitle(note);
  const fill = noteFill(note.color);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('accessibilityLabel', { title, when })}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        minHeight: ROW_MIN_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
      })}
    >
      {!multiDay && (
        <Box
          width={MARKER_SIZE}
          height={MARKER_SIZE}
          borderRadius="full"
          marginRight="sm"
          style={{ backgroundColor: fill }}
        />
      )}
      <Text
        variant="body-s-medium"
        color="textPrimary"
        numberOfLines={1}
        style={[{ flexShrink: 1 }, multiDay && { color: fill }]}
      >
        {title}
      </Text>
      {multiDay && (
        <Text variant="body-xs-regular" color="textSecondary" marginLeft="sm">
          {formatNoteShortRange(note)}
        </Text>
      )}
    </Pressable>
  );
}

/** The day's Note rows past the cap, as one row that opens the day sheet. */
function MoreNotesRow({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('moreNotesLabel', { count })}
      accessibilityHint={t('opensDay')}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        minHeight: ROW_MIN_HEIGHT,
        justifyContent: 'center',
      })}
    >
      <Text variant="body-xs-medium" color="textSecondary">
        {t('moreNotes', { count })}
      </Text>
    </Pressable>
  );
}
