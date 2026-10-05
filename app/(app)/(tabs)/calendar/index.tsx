import { type ComponentType, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalendarViewState } from './useCalendarRange';
import { useDaySheet } from './useDaySheet';
import { useMonthlyCalendar } from './useMonthlyCalendar';
import { useWeeklyCalendar } from './useWeeklyCalendar';
import Box from '@/components/Box';
import CalendarDaySheet from '@/components/CalendarDaySheet';
import CalendarHeader from '@/components/CalendarHeader';
import CalendarMonthGrid from '@/components/CalendarMonthGrid';
import type { CalendarView } from '@/components/CalendarViewToggle';
import CalendarWeekAgenda from '@/components/CalendarWeekAgenda';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import {
  type CalendarLabels,
  useCalendarLabels,
} from '@/hooks/useCalendarLabels';
import { useToday } from '@/hooks/useToday';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

interface CalendarRange {
  state: CalendarViewState;
  /** Any date in the visible range. */
  anchor: Date;
  goToPrevious: () => void;
  goToNext: () => void;
  refresh: () => void;
}

interface CalendarBodyProps {
  anchor: Date;
  workoutsByDate: Record<string, CalendarWorkout[]>;
  today: string;
  onDayPress: (day: CalendarDay) => void;
}

/** What differs between the Calendar's views; everything else is shared. */
interface CalendarViewConfig {
  useRange: () => CalendarRange;
  title: (labels: CalendarLabels, anchor: Date) => string;
  Body: ComponentType<CalendarBodyProps>;
}

const VIEWS: Record<CalendarView, CalendarViewConfig> = {
  monthly: {
    useRange() {
      const { state, month, goToPreviousMonth, goToNextMonth, refresh } =
        useMonthlyCalendar();

      return {
        state,
        anchor: month,
        goToPrevious: goToPreviousMonth,
        goToNext: goToNextMonth,
        refresh,
      };
    },
    title: (labels, anchor) => labels.month(anchor),
    Body: CalendarMonthGrid,
  },
  weekly: {
    useRange() {
      const { state, week, goToPreviousWeek, goToNextWeek, refresh } =
        useWeeklyCalendar();

      return {
        state,
        anchor: week,
        goToPrevious: goToPreviousWeek,
        goToNext: goToNextWeek,
        refresh,
      };
    },
    title: (labels, anchor) => labels.week(getWeekDays(anchor)),
    Body: CalendarWeekAgenda,
  },
};

/**
 * Only the active view is mounted (hence keyed), so switching views never
 * fetches for both — the shared per-day cache makes the switch instant
 * whenever the other view already covered the dates.
 */
export default function CalendarScreen() {
  const [view, setView] = useState<CalendarView>('monthly');

  return (
    <CalendarViewPane
      key={view}
      view={view}
      config={VIEWS[view]}
      onViewChange={setView}
    />
  );
}

interface CalendarViewPaneProps {
  view: CalendarView;
  config: CalendarViewConfig;
  onViewChange: (view: CalendarView) => void;
}

function CalendarViewPane({
  view,
  config,
  onViewChange,
}: CalendarViewPaneProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const labels = useCalendarLabels();
  const today = useToday();
  const { state, anchor, goToPrevious, goToNext, refresh } = config.useRange();
  const workoutsByDate =
    state.status === 'ready' ? state.workoutsByDate : undefined;
  const sheet = useDaySheet(workoutsByDate);

  if (state.status === 'hidden') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  function renderBody() {
    switch (state.status) {
      case 'loading':
        return (
          <Box marginTop="md" testID="calendar-loading">
            <ActivityIndicator color={theme.colors.textPrimary} />
          </Box>
        );
      case 'error':
        return (
          <Text
            variant="body-l-regular"
            color="textSecondary"
            textAlign="center"
            marginTop="md"
            paddingHorizontal="lg"
          >
            {t('error')}
          </Text>
        );
      case 'ready':
        return (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
            }}
          >
            <config.Body
              anchor={anchor}
              workoutsByDate={state.workoutsByDate}
              today={today}
              onDayPress={sheet.open}
            />
          </ScrollView>
        );
    }
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
        title={config.title(labels, anchor)}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onRefresh={refresh}
        refreshing={state.status === 'ready' && state.refreshing}
        refreshDisabled={state.status === 'loading'}
      />

      {renderBody()}

      <CalendarDaySheet selection={sheet.selection} onClose={sheet.close} />
    </Box>
  );
}
