import { type ReactNode, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalendarViewState } from './useCalendarRange';
import { useDaySheet } from './useDaySheet';
import { useMonthlyCalendar } from './useMonthlyCalendar';
import { useWeeklyCalendar } from './useWeeklyCalendar';
import Box from '@/components/Box';
import CalendarBody from '@/components/calendar/CalendarBody';
import CalendarDaySheet from '@/components/calendar/CalendarDaySheet';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarMonthGrid from '@/components/calendar/CalendarMonthGrid';
import type { CalendarView } from '@/components/calendar/CalendarViewToggle';
import CalendarWeekAgenda from '@/components/calendar/CalendarWeekAgenda';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useAppTheme } from '@/constants/theme';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

/**
 * Only the active view's hook is mounted, so switching views never fetches
 * for both — the shared per-day cache makes the switch instant whenever the
 * other view already covered the dates.
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
  const { state, month, goToPreviousMonth, goToNextMonth, refresh } =
    useMonthlyCalendar();

  return (
    <CalendarLayout
      view="monthly"
      onViewChange={onViewChange}
      title={labels.month(month)}
      state={state}
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
  const { state, week, goToPreviousWeek, goToNextWeek, refresh } =
    useWeeklyCalendar();

  return (
    <CalendarLayout
      view="weekly"
      onViewChange={onViewChange}
      title={labels.week(getWeekDays(week))}
      state={state}
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
  state: CalendarViewState;
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
  state,
  onPrevious,
  onNext,
  onRefresh,
  children,
}: CalendarLayoutProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheet = useDaySheet(
    state.status === 'ready' ? state.workoutsByDate : undefined,
  );

  if (state.status === 'hidden') {
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
        refreshStatus={refreshStatus(state)}
      />

      <CalendarBody state={state}>
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

function refreshStatus(state: CalendarViewState) {
  if (state.status === 'loading') {
    return 'disabled';
  }

  return state.status === 'ready' && state.refreshing ? 'refreshing' : 'idle';
}
