import { type ReactNode, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
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
import type { UseCalendarRangeResult } from '@/hooks/calendar/useCalendarRange';
import { useDaySheet } from '@/hooks/calendar/useDaySheet';
import { useMonthlyCalendar } from '@/hooks/calendar/useMonthlyCalendar';
import { useWeeklyCalendar } from '@/hooks/calendar/useWeeklyCalendar';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
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
  const {
    availability,
    query,
    refreshing,
    month,
    goToPreviousMonth,
    goToNextMonth,
    refresh,
  } = useMonthlyCalendar();

  return (
    <CalendarLayout
      view="monthly"
      onViewChange={onViewChange}
      title={labels.month(month)}
      availability={availability}
      query={query}
      refreshing={refreshing}
      onPrevious={goToPreviousMonth}
      onNext={goToNextMonth}
      onRefresh={refresh}
    >
      {(workoutsByDate, onDayPress) => (
        <CalendarMonthGrid
          month={month}
          workoutsByDate={workoutsByDate}
          onDayPress={onDayPress}
        />
      )}
    </CalendarLayout>
  );
}

function WeeklyCalendar({ onViewChange }: ViewProps) {
  const labels = useCalendarLabels();
  const {
    availability,
    query,
    refreshing,
    week,
    goToPreviousWeek,
    goToNextWeek,
    refresh,
  } = useWeeklyCalendar();

  return (
    <CalendarLayout
      view="weekly"
      onViewChange={onViewChange}
      title={labels.week(getWeekDays(week))}
      availability={availability}
      query={query}
      refreshing={refreshing}
      onPrevious={goToPreviousWeek}
      onNext={goToNextWeek}
      onRefresh={refresh}
    >
      {(workoutsByDate, onDayPress) => (
        <CalendarWeekAgenda
          week={week}
          workoutsByDate={workoutsByDate}
          onDayPress={onDayPress}
        />
      )}
    </CalendarLayout>
  );
}

interface CalendarLayoutProps extends ViewProps {
  view: CalendarView;
  title: string;
  availability: UseCalendarRangeResult['availability'];
  query: UseCalendarRangeResult['query'];
  refreshing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  /** The loaded view; `onDayPress` opens the day sheet. */
  children: (
    workoutsByDate: Record<string, CalendarWorkout[]>,
    onDayPress: (day: CalendarDay) => void,
  ) => ReactNode;
}

/**
 * Everything the two views share: the header (toggle, refresh, range
 * navigation), the loading/error/ready body, and the day sheet.
 */
function CalendarLayout({
  view,
  onViewChange,
  title,
  availability,
  query,
  refreshing,
  onPrevious,
  onNext,
  onRefresh,
  children,
}: CalendarLayoutProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheet = useDaySheet(query.data);

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
        onRefresh={onRefresh}
        refreshStatus={refreshStatus(query, refreshing)}
      />

      <CalendarBody state={bodyState(query)}>
        {workoutsByDate => children(workoutsByDate, sheet.open)}
      </CalendarBody>

      <CalendarDaySheet
        visible={sheet.visible}
        day={sheet.day}
        workouts={sheet.workouts}
        onClose={sheet.close}
      />
    </Box>
  );
}

/** Data wins over an error, so a failed refetch keeps the view on screen. */
function bodyState(query: UseCalendarRangeResult['query']): CalendarBodyState {
  if (query.data) {
    return { status: 'ready', workoutsByDate: query.data };
  }

  return query.isError ? { status: 'error' } : { status: 'loading' };
}

/** An error can be retried with a refresh; a first load can't. */
function refreshStatus(
  query: UseCalendarRangeResult['query'],
  refreshing: boolean,
) {
  if (!query.data && !query.isError) {
    return 'disabled';
  }

  return refreshing ? 'refreshing' : 'idle';
}
