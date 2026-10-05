import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalendarViewState } from './useCalendarRange';
import { useDaySheet } from './useDaySheet';
import { useMonthlyCalendar } from './useMonthlyCalendar';
import { useWeeklyCalendar } from './useWeeklyCalendar';
import Box from '@/components/Box';
import CalendarDaySheet from '@/components/CalendarDaySheet';
import CalendarMonthGrid from '@/components/CalendarMonthGrid';
import CalendarNavButton from '@/components/CalendarNavButton';
import CalendarViewToggle, {
  type CalendarView,
} from '@/components/CalendarViewToggle';
import CalendarWeekAgenda from '@/components/CalendarWeekAgenda';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useCalendarLabels } from '@/hooks/useCalendarLabels';
import { getWeekDays } from '@/lib/calendarGrid';
import { toLocalDateString } from '@/lib/localDate';
import { Ionicons } from '@expo/vector-icons';

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
  const sheet = useDaySheet(state);

  return (
    <CalendarLayout
      view="monthly"
      onViewChange={onViewChange}
      title={labels.month(month)}
      state={state}
      sheet={sheet}
      onPrevious={goToPreviousMonth}
      onNext={goToNextMonth}
      onRefresh={refresh}
    >
      {state.status === 'ready' && (
        <CalendarMonthGrid
          month={month}
          workoutsByDate={state.workoutsByDate}
          today={toLocalDateString(new Date())}
          onDayPress={sheet.open}
        />
      )}
    </CalendarLayout>
  );
}

function WeeklyCalendar({ onViewChange }: ViewProps) {
  const labels = useCalendarLabels();
  const { state, week, goToPreviousWeek, goToNextWeek, refresh } =
    useWeeklyCalendar();
  const sheet = useDaySheet(state);

  return (
    <CalendarLayout
      view="weekly"
      onViewChange={onViewChange}
      title={labels.week(getWeekDays(week))}
      state={state}
      sheet={sheet}
      onPrevious={goToPreviousWeek}
      onNext={goToNextWeek}
      onRefresh={refresh}
    >
      {state.status === 'ready' && (
        <CalendarWeekAgenda
          week={week}
          workoutsByDate={state.workoutsByDate}
          today={toLocalDateString(new Date())}
          onDayPress={sheet.open}
        />
      )}
    </CalendarLayout>
  );
}

interface CalendarLayoutProps extends ViewProps {
  view: CalendarView;
  title: string;
  state: CalendarViewState;
  sheet: ReturnType<typeof useDaySheet>;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  /** The view's body, rendered in the scroll area once the state is ready. */
  children: ReactNode;
}

/**
 * Everything the two views share: the view toggle, refresh control, range
 * navigation, loading/error states, and the day sheet.
 */
function CalendarLayout({
  view,
  onViewChange,
  title,
  state,
  sheet,
  onPrevious,
  onNext,
  onRefresh,
  children,
}: CalendarLayoutProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  if (state.status === 'hidden') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      style={{ paddingTop: insets.top + theme.spacing.xl }}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="lg"
      >
        <CalendarViewToggle view={view} onViewChange={onViewChange} />

        <Box width={24} height={24} alignItems="center" justifyContent="center">
          {state.status === 'ready' && state.refreshing ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.textSecondary}
              testID="calendar-refreshing"
            />
          ) : (
            <TouchableOpacity
              onPress={onRefresh}
              disabled={state.status === 'loading'}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('refresh')}
            >
              <Ionicons
                name="refresh"
                size={22}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </Box>
      </Box>

      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="lg"
        marginVertical="base"
      >
        <CalendarNavButton
          icon="chevron-back"
          label={t('previous')}
          onPress={onPrevious}
        />
        <Text variant="h3">{title}</Text>
        <CalendarNavButton
          icon="chevron-forward"
          label={t('next')}
          onPress={onNext}
        />
      </Box>

      {state.status === 'loading' && (
        <Box marginTop="md" testID="calendar-loading">
          <ActivityIndicator color={theme.colors.textPrimary} />
        </Box>
      )}

      {state.status === 'error' && (
        <Text
          variant="body-l-regular"
          color="textSecondary"
          textAlign="center"
          marginTop="md"
          paddingHorizontal="lg"
        >
          {t('error')}
        </Text>
      )}

      {state.status === 'ready' && (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
          }}
        >
          {children}
        </ScrollView>
      )}

      <CalendarDaySheet selection={sheet.selection} onClose={sheet.close} />
    </Box>
  );
}
