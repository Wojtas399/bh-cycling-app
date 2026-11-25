import { useMemo } from 'react';
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
import { useCalendarWords } from '@/components/calendar/useCalendarWords';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import { useAppTheme } from '@/constants/theme';
import { useToday } from '@/hooks/useToday';
import { bleedHitArea, bleedPastVerticalPadding } from '@/lib/bleed';
import type { CalendarItemsByDate } from '@/lib/calendarItems';
import {
  type CalendarPressTarget,
  type ItemRow,
  type MoreNotesRow,
  type WeekDay,
  type WeekNoteRow,
  type WeekRow,
  weekView,
} from '@/lib/calendarViewModels';
import { noteFill } from '@/lib/noteColors';
import type { Note } from '@/lib/notes';
import type { Race } from '@/lib/races';

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

type OnPress = (target: CalendarPressTarget) => void;

export interface CalendarWeekAgendaProps {
  week: Date;
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
  onPress: OnPress;
}

export default function CalendarWeekAgenda({
  week,
  itemsByDate,
  notes,
  onPress,
}: CalendarWeekAgendaProps) {
  const words = useCalendarWords();
  const today = useToday();
  const { laneCount, days } = useMemo(
    () => weekView(week, { itemsByDate, notes }, today, words),
    [week, itemsByDate, notes, today, words],
  );

  return (
    <Box testID="calendar-week-agenda">
      {days.map((day, index) => (
        <TouchableOpacity
          key={day.date}
          onPress={() => onPress(day.press)}
          {...SCREEN_READER_REACHES_RAIL_AND_ROWS_ONE_BY_ONE}
          testID={`calendar-day-${day.date}`}
        >
          <Box
            flexDirection="row"
            paddingVertical={DAY_PADDING_VERTICAL}
            borderTopWidth={index === 0 ? 0 : 1}
            borderColor="hairline"
          >
            <NoteLanes weekLaneCount={laneCount} crossings={day.crossings} />

            <DateRail day={day} onPress={() => onPress(day.press)} />

            <Box flex={1} minWidth={0} marginLeft="md">
              {day.rows.map((row, i) => (
                <Box
                  key={row.key}
                  borderTopWidth={i === 0 ? 0 : 1}
                  borderColor="hairline"
                >
                  <WeekRowView row={row} onPress={onPress} />
                </Box>
              ))}
            </Box>
          </Box>
        </TouchableOpacity>
      ))}
    </Box>
  );
}

function WeekRowView({ row, onPress }: { row: WeekRow; onPress: OnPress }) {
  switch (row.kind) {
    case 'note':
      return <NoteRowButton row={row} onPress={() => onPress(row.press)} />;
    case 'moreNotes':
      return <MoreNotesButton row={row} onPress={() => onPress(row.press)} />;
    case 'item':
      return <ItemRowView row={row} onPress={onPress} />;
    case 'rest':
      return <RestRow />;
  }
}

interface NoteLanesProps {
  weekLaneCount: number;
  crossings: WeekDay['crossings'];
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
  day: WeekDay;
  onPress: () => void;
}

function DateRail({
  day: { weekday, dayOfMonth, isToday, railLabel },
  onPress,
}: DateRailProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });
  const { colors, spacing } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="header"
      accessibilityLabel={railLabel}
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
        {weekday}
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
          {dayOfMonth}
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

function ItemRowView({ row, onPress }: { row: ItemRow; onPress: OnPress }) {
  const { press } = row;
  const content = <ItemRowContent row={row} />;

  if (!press) {
    return (
      <Box
        accessible
        accessibilityLabel={row.label}
        minHeight={ROW_MIN_TAP_TARGET_HEIGHT}
        justifyContent="center"
      >
        {content}
      </Box>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(press)}
      accessibilityRole="button"
      accessibilityLabel={row.label}
      style={rowPressStyle({ justifyContent: 'center' })}
    >
      {content}
    </Pressable>
  );
}

function ItemRowContent({
  row: { display, title, figures },
}: {
  row: ItemRow;
}) {
  return (
    <Box flexDirection="row" alignItems="center">
      <RowMarker display={display} />
      <Text
        variant="body-s-medium"
        numberOfLines={1}
        marginLeft="sm"
        style={{ flex: 1 }}
      >
        {title}
      </Text>
      {display.kind === 'workout' && display.blocks.length > 0 && (
        <Box
          width={MINI_PROFILE.width}
          marginLeft="sm"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <WorkoutProfile
            blocks={display.blocks}
            height={MINI_PROFILE.height}
          />
        </Box>
      )}
      {display.kind === 'race' && <PriorityTag priority={display.priority} />}
      {figures !== undefined && (
        <Text
          variant="body-xs-regular"
          color="textSecondary"
          marginLeft="sm"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {figures}
        </Text>
      )}
    </Box>
  );
}

function RowMarker({ display }: { display: ItemRow['display'] }) {
  switch (display.kind) {
    case 'workout':
      return <WorkoutStatusDot status={display.status} size={MARKER_SIZE} />;
    case 'activity':
      return <ActivityRing />;
    case 'race':
      return (
        <Box flexDirection="row" alignItems="center" gap="xs">
          {display.paired && (
            <WorkoutStatusDot status="completed" size={MARKER_SIZE} />
          )}
          <RaceRankIcon priority={display.priority} size={14} />
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

interface NoteRowButtonProps {
  row: WeekNoteRow;
  onPress: () => void;
}

function NoteRowButton({ row, onPress }: NoteRowButtonProps) {
  const fill = noteFill(row.note.color);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={row.label}
      style={rowPressStyle({ flexDirection: 'row', alignItems: 'center' })}
    >
      {!row.multiDay && (
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
        style={[{ flexShrink: 1 }, row.multiDay && { color: fill }]}
      >
        {row.title}
      </Text>
      {row.multiDay && (
        <Text variant="body-xs-regular" color="textSecondary" marginLeft="sm">
          {row.shortRange}
        </Text>
      )}
    </Pressable>
  );
}

function MoreNotesButton({
  row: { text, label },
  onPress,
}: {
  row: MoreNotesRow;
  onPress: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar.week' });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('opensDay')}
      style={rowPressStyle({ justifyContent: 'center' })}
    >
      <Text variant="body-xs-medium" color="textSecondary">
        {text}
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
