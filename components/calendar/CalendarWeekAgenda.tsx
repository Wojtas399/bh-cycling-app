import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  type PressableStateCallbackType,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import { useAppTheme } from '@/constants/theme';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import { useToday } from '@/hooks/useToday';
import { bleedHitArea, bleedPastVerticalPadding } from '@/lib/bleed';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import {
  type CalendarItem,
  type CalendarItemsByDate,
  calendarItemKey,
} from '@/lib/calendarItems';
import {
  type CompactItemRow,
  type CompactItemRowWords,
  type ItemPressHandlers,
  compactItemRow,
  compactItemRowLabel,
  compactItemRowPress,
  rowFigures,
} from '@/lib/compactItemRow';
import { formatDuration, formatSpokenDuration } from '@/lib/formatDuration';
import { noteFill } from '@/lib/noteColors';
import { formatNoteRange, formatNoteShortRange } from '@/lib/noteDates';
import type { Note } from '@/lib/notes';
import type { Race } from '@/lib/races';
import { type LaneCrossing, type NoteRow, weekNotes } from '@/lib/weekNotes';

const RAIL_WIDTH = 44;
const DAY_PADDING_VERTICAL = 'md';
const DAY_NUMBER_SQUARE = { width: 40, height: 36 };
const ROW_MIN_TAP_TARGET_HEIGHT = 44;
const MINI_PROFILE = { width: 54, height: 14 };
const MARKER_SIZE = 8;
const NOTE_LANE_LINE_WIDTH = 3;
const NOTE_LANE_GAP = 3;
const NOTE_LINE_INSET_ON_ITS_FIRST_OR_LAST_DAY = 14;
const SCREEN_READER_REACHES_RAIL_AND_ROWS_ONE_BY_ONE = {
  accessible: false,
} as const;

export interface CalendarWeekAgendaProps extends ItemPressHandlers {
  week: Date;
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
  onDayPress: (day: CalendarDay) => void;
  onNotePress: (note: Note) => void;
}

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
              spokenWhen={
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
            {...SCREEN_READER_REACHES_RAIL_AND_ROWS_ONE_BY_ONE}
            testID={`calendar-day-${day.date}`}
          >
            <Box
              flexDirection="row"
              paddingVertical={DAY_PADDING_VERTICAL}
              borderTopWidth={index === 0 ? 0 : 1}
              borderColor="hairline"
            >
              <NoteLanes
                weekLaneCount={layout.lanes.length}
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
  weekLaneCount: number;
  crossings: LaneCrossing[];
}

function NoteLanes({ weekLaneCount, crossings }: NoteLanesProps) {
  const { spacing } = useAppTheme();

  if (weekLaneCount === 0) return null;

  return (
    <Box
      width={weekLaneCount * (NOTE_LANE_LINE_WIDTH + NOTE_LANE_GAP)}
      style={bleedPastVerticalPadding(spacing[DAY_PADDING_VERTICAL])}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {crossings.map(({ note, lane, starts, ends }) => (
        <Box
          key={note.id}
          position="absolute"
          width={NOTE_LANE_LINE_WIDTH}
          borderRadius="full"
          style={{
            left: lane * (NOTE_LANE_LINE_WIDTH + NOTE_LANE_GAP),
            top: starts ? NOTE_LINE_INSET_ON_ITS_FIRST_OR_LAST_DAY : 0,
            bottom: ends ? NOTE_LINE_INSET_ON_ITS_FIRST_OR_LAST_DAY : 0,
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
        ...bleedHitArea(spacing[DAY_PADDING_VERTICAL]),
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
        width={DAY_NUMBER_SQUARE.width}
        height={DAY_NUMBER_SQUARE.height}
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

function RestRow() {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });

  return (
    <Box minHeight={ROW_MIN_TAP_TARGET_HEIGHT} justifyContent="center">
      <Text variant="body-s-regular" color="textTertiary">
        {t('rest')}
      </Text>
    </Box>
  );
}

interface ItemRowProps extends ItemPressHandlers {
  item: CalendarItem;
}

function ItemRow({ item, ...handlers }: ItemRowProps) {
  const { t } = useTranslation();
  const words = useCompactRowWords();
  const row = compactItemRow(item, t('common.stravaActivity'));
  const label = compactItemRowLabel(row, words);
  const onPress = compactItemRowPress(item, handlers);
  const content = <ItemRowContent row={row} />;

  if (!onPress) {
    return (
      <Box
        accessible
        accessibilityLabel={label}
        minHeight={ROW_MIN_TAP_TARGET_HEIGHT}
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
      style={rowPressStyle({ justifyContent: 'center' })}
    >
      {content}
    </Pressable>
  );
}

function ItemRowContent({ row }: { row: CompactItemRow }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });
  const figures = rowFigures(row, {
    duration: formatDuration,
    load: load => t('load', { load }),
  });

  return (
    <Box flexDirection="row" alignItems="center">
      <RowMarker row={row} />
      <Text
        variant="body-s-medium"
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
  spokenWhen: string;
  onPress: () => void;
}

function NoteRowButton({
  row: { note, multiDay },
  spokenWhen,
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
      accessibilityLabel={t('accessibilityLabel', {
        title,
        when: spokenWhen,
      })}
      style={rowPressStyle({ flexDirection: 'row', alignItems: 'center' })}
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
      style={rowPressStyle({ justifyContent: 'center' })}
    >
      <Text variant="body-xs-medium" color="textSecondary">
        {t('moreNotes', { count })}
      </Text>
    </Pressable>
  );
}

function rowPressStyle(layout: ViewStyle) {
  return ({ pressed }: PressableStateCallbackType): ViewStyle => ({
    opacity: pressed ? 0.7 : 1,
    minHeight: ROW_MIN_TAP_TARGET_HEIGHT,
    ...layout,
  });
}
