import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalendarViewState } from './useCalendarRange';
import { useMonthlyCalendar } from './useMonthlyCalendar';
import { useWeeklyCalendar } from './useWeeklyCalendar';
import Box from '@/components/Box';
import CalendarDaySheet from '@/components/CalendarDaySheet';
import CalendarMonthGrid from '@/components/CalendarMonthGrid';
import CalendarWeekAgenda from '@/components/CalendarWeekAgenda';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useCalendarLabels } from '@/hooks/useCalendarLabels';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import { toLocalDateString } from '@/lib/localDate';
import type { CalendarWorkout } from '@/lib/workoutStatus';
import { Ionicons } from '@expo/vector-icons';

type CalendarView = 'monthly' | 'weekly';

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
      renderBody={props => <CalendarMonthGrid month={month} {...props} />}
    />
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
      renderBody={props => <CalendarWeekAgenda week={week} {...props} />}
    />
  );
}

interface BodyProps {
  workoutsByDate: Record<string, CalendarWorkout[]>;
  today: string;
  onDayPress: (day: CalendarDay) => void;
}

interface CalendarLayoutProps extends ViewProps {
  view: CalendarView;
  title: string;
  state: CalendarViewState;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  renderBody: (props: BodyProps) => ReactNode;
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
  onPrevious,
  onNext,
  onRefresh,
  renderBody,
}: CalendarLayoutProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // The sheet only shows data already on screen; once that's gone (a range
  // reload, a disconnect) the selection goes too, so it can't reappear later.
  if (state.status !== 'ready' && selectedDay !== null) {
    setSelectedDay(null);
  }

  if (state.status === 'hidden') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  const workoutsByDate = state.status === 'ready' ? state.workoutsByDate : {};

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
        <ViewToggle view={view} onViewChange={onViewChange} />

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
        <NavButton
          icon="chevron-back"
          label={t('previous')}
          onPress={onPrevious}
        />
        <Text variant="h3">{title}</Text>
        <NavButton icon="chevron-forward" label={t('next')} onPress={onNext} />
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
          {renderBody({
            workoutsByDate,
            today: toLocalDateString(new Date()),
            onDayPress: setSelectedDay,
          })}
        </ScrollView>
      )}

      <CalendarDaySheet
        day={selectedDay}
        workouts={selectedDay ? (workoutsByDate[selectedDay.date] ?? []) : []}
        onClose={() => setSelectedDay(null)}
      />
    </Box>
  );
}

function ViewToggle({
  view,
  onViewChange,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });

  return (
    <Box
      flexDirection="row"
      backgroundColor="bgTertiary"
      borderRadius="full"
      padding="xs"
    >
      {(['monthly', 'weekly'] as const).map(option => {
        const selected = option === view;

        return (
          <TouchableOpacity
            key={option}
            onPress={() => onViewChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Box
              paddingHorizontal="base"
              paddingVertical="xs"
              borderRadius="full"
              backgroundColor={selected ? 'interactiveDefault' : 'transparent'}
            >
              <Text
                variant="body-s-medium"
                color={selected ? 'textInverse' : 'textSecondary'}
              >
                {t(option)}
              </Text>
            </Box>
          </TouchableOpacity>
        );
      })}
    </Box>
  );
}

function NavButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={24} color={theme.colors.textPrimary} />
    </TouchableOpacity>
  );
}
