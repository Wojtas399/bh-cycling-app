import { type ReactNode, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import NoteDetailSheet from '@/components/NoteDetailSheet';
import CalendarBody, {
  type CalendarBodyState,
} from '@/components/calendar/CalendarBody';
import CalendarDaySheet from '@/components/calendar/CalendarDaySheet';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarMonthGrid from '@/components/calendar/CalendarMonthGrid';
import type { CalendarView } from '@/components/calendar/CalendarViewToggle';
import CalendarWeekAgenda from '@/components/calendar/CalendarWeekAgenda';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useAppTheme } from '@/constants/theme';
import { useOpenActivityDetails } from '@/hooks/activity/useOpenActivityDetails';
import { useCalendarNoteSheet } from '@/hooks/calendar/useCalendarNoteSheet';
import type { CalendarRangeView } from '@/hooks/calendar/useCalendarRange';
import { useDaySheet } from '@/hooks/calendar/useDaySheet';
import { useMonthlyCalendar } from '@/hooks/calendar/useMonthlyCalendar';
import { useWeeklyCalendar } from '@/hooks/calendar/useWeeklyCalendar';
import { useOpenWorkoutDetails } from '@/hooks/workout/useOpenWorkoutDetails';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import type {
  CalendarItemsByDate,
  UnplannedActivity,
} from '@/lib/calendarItems';
import { calendarRefreshStatus } from '@/lib/calendarRefreshStatus';
import type { Note } from '@/lib/notes';
import type { CalendarWorkout } from '@/lib/workoutStatus';

/**
 * Only the active view's hook is mounted, so switching views never fetches
 * for both — both read the same per-month queries, so the switch is instant
 * whenever the other view already loaded the months.
 */
export default function CalendarScreen() {
  const [view, setView] = useState<CalendarView>('monthly');

  return view === 'monthly' ? (
    <MonthlyCalendar onViewChange={setView} />
  ) : (
    <WeeklyCalendar onViewChange={setView} />
  );
}

interface ViewProps {
  onViewChange: (view: CalendarView) => void;
}

function MonthlyCalendar({ onViewChange }: ViewProps) {
  const labels = useCalendarLabels();
  const { month, goToPreviousMonth, goToNextMonth, ...range } =
    useMonthlyCalendar();

  return (
    <CalendarLayout
      view="monthly"
      fillBody
      onViewChange={onViewChange}
      title={labels.month(month)}
      range={range}
      onPrevious={goToPreviousMonth}
      onNext={goToNextMonth}
    >
      {({ itemsByDate, notes, onDayPress }) => (
        <CalendarMonthGrid
          month={month}
          itemsByDate={itemsByDate}
          notes={notes}
          onDayPress={onDayPress}
        />
      )}
    </CalendarLayout>
  );
}

function WeeklyCalendar({ onViewChange }: ViewProps) {
  const labels = useCalendarLabels();
  const { week, goToPreviousWeek, goToNextWeek, ...range } =
    useWeeklyCalendar();

  return (
    <CalendarLayout
      view="weekly"
      onViewChange={onViewChange}
      title={labels.week(getWeekDays(week))}
      range={range}
      onPrevious={goToPreviousWeek}
      onNext={goToNextWeek}
    >
      {({
        itemsByDate,
        notes,
        onDayPress,
        onWorkoutPress,
        onActivityPress,
        onNotePress,
      }) => (
        <CalendarWeekAgenda
          week={week}
          itemsByDate={itemsByDate}
          notes={notes}
          onDayPress={onDayPress}
          onWorkoutPress={onWorkoutPress}
          onActivityPress={onActivityPress}
          onNotePress={onNotePress}
        />
      )}
    </CalendarLayout>
  );
}

interface CalendarLayoutProps extends ViewProps {
  view: CalendarView;
  /** The loaded view fills the body instead of scrolling (see `CalendarBody`). */
  fillBody?: boolean;
  title: string;
  range: CalendarRangeView;
  onPrevious: () => void;
  onNext: () => void;
  /** The loaded view. */
  children: (view: LoadedViewProps) => ReactNode;
}

interface LoadedViewProps {
  itemsByDate: CalendarItemsByDate;
  /** The whole Notes overlapping the range, in `id` order. */
  notes: Note[];
  /** Opens the day sheet. */
  onDayPress: (day: CalendarDay) => void;
  /** Opens the Workout's details, dismissing the day sheet if it is open. */
  onWorkoutPress: (workout: CalendarWorkout) => void;
  /** Opens the Activity's details, dismissing the day sheet if it is open. */
  onActivityPress: (activity: UnplannedActivity) => void;
  /** Opens the Note Detail Sheet straight from the view (no day sheet). */
  onNotePress: (note: Note) => void;
}

/**
 * Everything the two views share: the header (toggle, refresh, range
 * navigation), the loading/error/ready body, the day sheet and the Note
 * Detail Sheet.
 */
function CalendarLayout({
  view,
  fillBody,
  onViewChange,
  title,
  range: { availability, query, refresh, refreshing },
  onPrevious,
  onNext,
  children,
}: CalendarLayoutProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheet = useDaySheet(query.data);
  const noteSheet = useCalendarNoteSheet(query.data?.notes, sheet.close);
  const openWorkout = useOpenWorkoutDetails();
  const openActivity = useOpenActivityDetails();

  // The day sheet is a native Expo UI sheet (ADR 0003) that would otherwise
  // linger above the pushed screen, so it is dismissed as the push happens.
  function handleWorkoutPress(workout: CalendarWorkout) {
    sheet.close();
    openWorkout(workout.id);
  }

  function handleActivityPress(activity: UnplannedActivity) {
    sheet.close();
    openActivity(activity.id);
  }

  if (availability === 'unavailable') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      style={{ paddingTop: insets.top + theme.spacing.xl }}
    >
      <CalendarHeader
        view={view}
        onViewChange={onViewChange}
        title={title}
        onPrevious={onPrevious}
        onNext={onNext}
        onRefresh={refresh}
        refreshStatus={calendarRefreshStatus(query, refreshing)}
      />

      <CalendarBody state={bodyState(query)} fill={fillBody}>
        {({ itemsByDate, notes }) =>
          children({
            itemsByDate,
            notes,
            onDayPress: sheet.open,
            onWorkoutPress: handleWorkoutPress,
            onActivityPress: handleActivityPress,
            onNotePress: note => noteSheet.open(note.id),
          })
        }
      </CalendarBody>

      <CalendarDaySheet
        visible={sheet.visible}
        day={sheet.day}
        items={sheet.items}
        notes={sheet.notes}
        isEmpty={sheet.isEmpty}
        onClose={sheet.close}
        onWorkoutPress={handleWorkoutPress}
        onActivityPress={handleActivityPress}
        onNotePress={note => noteSheet.openFromDaySheet(note.id)}
      />

      <NoteDetailSheet sheet={noteSheet} />
    </Box>
  );
}

/** Data wins over an error, so a failed refetch keeps the view on screen. */
function bodyState(query: CalendarRangeView['query']): CalendarBodyState {
  if (query.data) {
    return { status: 'ready', data: query.data };
  }

  return query.isError ? { status: 'error' } : { status: 'loading' };
}
