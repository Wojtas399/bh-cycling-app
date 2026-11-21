import { type ReactNode, useState } from 'react';

import Box from '@/components/Box';
import GlassHeader from '@/components/GlassHeader';
import CalendarBody, {
  type CalendarBodyState,
} from '@/components/calendar/CalendarBody';
import CalendarDaySheet from '@/components/calendar/CalendarDaySheet';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarMonthGrid from '@/components/calendar/CalendarMonthGrid';
import CalendarWeekAgenda from '@/components/calendar/CalendarWeekAgenda';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import RaceDetailSheet from '@/components/race/RaceDetailSheet';
import { useOpenActivityDetails } from '@/hooks/activity/useOpenActivityDetails';
import { useCalendarRaceSheet } from '@/hooks/calendar/useCalendarRaceSheet';
import type { CalendarRangeView } from '@/hooks/calendar/useCalendarRange';
import { useDaySheet } from '@/hooks/calendar/useDaySheet';
import { useMonthlyCalendar } from '@/hooks/calendar/useMonthlyCalendar';
import { useWeeklyCalendar } from '@/hooks/calendar/useWeeklyCalendar';
import { useOpenNoteDetails } from '@/hooks/note/useOpenNoteDetails';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useToday } from '@/hooks/useToday';
import { useOpenWorkoutDetails } from '@/hooks/workout/useOpenWorkoutDetails';
import { type CalendarDay, getWeekDays } from '@/lib/calendarGrid';
import type {
  CalendarItemsByDate,
  UnplannedActivity,
} from '@/lib/calendarItems';
import { calendarRefreshStatus } from '@/lib/calendarRefreshStatus';
import { type CalendarView, otherViewStartDate } from '@/lib/calendarView';
import type { Note } from '@/lib/notes';
import type { Race } from '@/lib/races';
import type { CalendarWorkout } from '@/lib/workoutStatus';

interface CalendarPlace {
  view: CalendarView;
  startDate?: Date;
}

export default function CalendarScreen() {
  const [place, setPlace] = useState<CalendarPlace>({ view: 'monthly' });
  const today = useToday();

  function switchViewKeepingPlace(view: CalendarView, visibleRangeStart: Date) {
    if (view === place.view) return;

    setPlace({
      view,
      startDate: otherViewStartDate(place.view, visibleRangeStart, today),
    });
  }

  return place.view === 'monthly' ? (
    <MonthlyCalendar
      startDate={place.startDate}
      onViewChange={switchViewKeepingPlace}
    />
  ) : (
    <WeeklyCalendar
      startDate={place.startDate}
      onViewChange={switchViewKeepingPlace}
    />
  );
}

interface ViewProps {
  startDate?: Date;
  onViewChange: (view: CalendarView, visibleRangeStart: Date) => void;
}

function MonthlyCalendar({ startDate, onViewChange }: ViewProps) {
  const labels = useCalendarLabels();
  const { month, goToPreviousMonth, goToNextMonth, ...range } =
    useMonthlyCalendar(startDate);

  return (
    <CalendarLayout
      view="monthly"
      fillWithoutScrollOrPadding
      onViewChange={view => onViewChange(view, month)}
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

function WeeklyCalendar({ startDate, onViewChange }: ViewProps) {
  const labels = useCalendarLabels();
  const { week, goToPreviousWeek, goToNextWeek, ...range } =
    useWeeklyCalendar(startDate);

  return (
    <CalendarLayout
      view="weekly"
      onViewChange={view => onViewChange(view, week)}
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
        onRacePress,
        onNotePress,
      }) => (
        <CalendarWeekAgenda
          week={week}
          itemsByDate={itemsByDate}
          notes={notes}
          onDayPress={onDayPress}
          onWorkoutPress={onWorkoutPress}
          onActivityPress={onActivityPress}
          onRacePress={onRacePress}
          onNotePress={onNotePress}
        />
      )}
    </CalendarLayout>
  );
}

interface CalendarLayoutProps {
  view: CalendarView;
  fillWithoutScrollOrPadding?: boolean;
  onViewChange: (view: CalendarView) => void;
  title: string;
  range: CalendarRangeView;
  onPrevious: () => void;
  onNext: () => void;
  children: (view: LoadedViewProps) => ReactNode;
}

interface LoadedViewProps {
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
  onDayPress: (day: CalendarDay) => void;
  onWorkoutPress: (workout: CalendarWorkout) => void;
  onActivityPress: (activity: UnplannedActivity) => void;
  onRacePress: (race: Race) => void;
  onNotePress: (note: Note) => void;
}

function CalendarLayout({
  view,
  fillWithoutScrollOrPadding,
  onViewChange,
  title,
  range: { availability, query, goToToday, showsToday, refresh, refreshing },
  onPrevious,
  onNext,
  children,
}: CalendarLayoutProps) {
  const header = useGlassHeader('tab');
  const sheet = useDaySheet(query.data);
  const raceSheet = useCalendarRaceSheet(sheet.closeThen);
  const openWorkout = useOpenWorkoutDetails();
  const openActivity = useOpenActivityDetails();
  const openNote = useOpenNoteDetails();

  if (availability === 'unavailable') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <CalendarBody
        state={bodyStatePreferringDataOverError(query)}
        fillWithoutScrollOrPadding={fillWithoutScrollOrPadding}
        header={header}
      >
        {({ itemsByDate, notes }) =>
          children({
            itemsByDate,
            notes,
            onDayPress: sheet.open,
            onWorkoutPress: workout => openWorkout(workout.id),
            onActivityPress: activity => openActivity(activity.id),
            onRacePress: raceSheet.open,
            onNotePress: note => openNote(note.id),
          })
        }
      </CalendarBody>

      <GlassHeader onLayout={header.onLayout}>
        <Box paddingTop="sm">
          <CalendarHeader
            view={view}
            onViewChange={onViewChange}
            title={title}
            onPrevious={onPrevious}
            onNext={onNext}
            showTodayPill={!showsToday}
            onToday={goToToday}
            onRefresh={refresh}
            refreshStatus={calendarRefreshStatus(query, refreshing)}
          />
        </Box>
      </GlassHeader>

      <CalendarDaySheet
        visible={sheet.visible}
        day={sheet.day}
        items={sheet.items}
        notes={sheet.notes}
        isEmpty={sheet.isEmpty}
        onClose={sheet.close}
        onDismissed={sheet.onDismissed}
        onWorkoutPress={workout =>
          sheet.closeThen(() => openWorkout(workout.id))
        }
        onActivityPress={activity =>
          sheet.closeThen(() => openActivity(activity.id))
        }
        onRacePress={raceSheet.openFromDaySheet}
        onNotePress={note => sheet.closeThen(() => openNote(note.id))}
      />

      <RaceDetailSheet sheet={raceSheet} />
    </Box>
  );
}

function bodyStatePreferringDataOverError(
  query: CalendarRangeView['query'],
): CalendarBodyState {
  if (query.data) {
    return { status: 'ready', data: query.data };
  }

  return query.isError ? { status: 'error' } : { status: 'loading' };
}
