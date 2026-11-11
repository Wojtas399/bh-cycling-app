import { type ReactNode, useState } from 'react';

import Box from '@/components/Box';
import GlassHeader from '@/components/GlassHeader';
import NoteDetailSheet from '@/components/NoteDetailSheet';
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
import { useCalendarNoteSheet } from '@/hooks/calendar/useCalendarNoteSheet';
import { useCalendarRaceSheet } from '@/hooks/calendar/useCalendarRaceSheet';
import type { CalendarRangeView } from '@/hooks/calendar/useCalendarRange';
import { useDaySheet } from '@/hooks/calendar/useDaySheet';
import { useMonthlyCalendar } from '@/hooks/calendar/useMonthlyCalendar';
import { useWeeklyCalendar } from '@/hooks/calendar/useWeeklyCalendar';
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
  /** Where the view opens. Without one it opens on today's month or week. */
  startDate?: Date;
}

/**
 * Only the active view's hook is mounted, so switching views never fetches
 * for both — both read the same per-month queries, so the switch is instant
 * whenever the other view already loaded the months. A switch keeps the
 * user's place: the view it mounts opens near the range being left.
 */
export default function CalendarScreen() {
  const [place, setPlace] = useState<CalendarPlace>({ view: 'monthly' });
  const today = useToday();

  function changeView(view: CalendarView, anchor: Date) {
    if (view === place.view) return;

    setPlace({
      view,
      startDate: otherViewStartDate(place.view, anchor, today),
    });
  }

  return place.view === 'monthly' ? (
    <MonthlyCalendar startDate={place.startDate} onViewChange={changeView} />
  ) : (
    <WeeklyCalendar startDate={place.startDate} onViewChange={changeView} />
  );
}

interface ViewProps {
  startDate?: Date;
  /** `anchor` is the visible range's: the month's 1st or the week's Monday. */
  onViewChange: (view: CalendarView, anchor: Date) => void;
}

function MonthlyCalendar({ startDate, onViewChange }: ViewProps) {
  const labels = useCalendarLabels();
  const { month, goToPreviousMonth, goToNextMonth, ...range } =
    useMonthlyCalendar(startDate);

  return (
    <CalendarLayout
      view="monthly"
      fill
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
  /** The loaded view fills the body instead of scrolling (see `CalendarBody`). */
  fill?: boolean;
  onViewChange: (view: CalendarView) => void;
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
  /** Opens the Workout's details. */
  onWorkoutPress: (workout: CalendarWorkout) => void;
  /** Opens the Activity's details. */
  onActivityPress: (activity: UnplannedActivity) => void;
  /** Opens the Race Detail Sheet straight from the view (no day sheet). */
  onRacePress: (race: Race) => void;
  /** Opens the Note Detail Sheet straight from the view (no day sheet). */
  onNotePress: (note: Note) => void;
}

/**
 * Everything the two views share: the header (toggle, "Dziś", refresh, range
 * navigation) sticky on Glass, the loading/error/ready body under it, the
 * day sheet, and the Note and Race Detail Sheets.
 */
function CalendarLayout({
  view,
  fill,
  onViewChange,
  title,
  range: { availability, query, goToToday, showsToday, refresh, refreshing },
  onPrevious,
  onNext,
  children,
}: CalendarLayoutProps) {
  const header = useGlassHeader('tab');
  const sheet = useDaySheet(query.data);
  const noteSheet = useCalendarNoteSheet(query.data?.notes, sheet.closeThen);
  const raceSheet = useCalendarRaceSheet(sheet.closeThen);
  const openWorkout = useOpenWorkoutDetails();
  const openActivity = useOpenActivityDetails();

  if (availability === 'unavailable') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <CalendarBody state={bodyState(query)} fill={fill} header={header}>
        {({ itemsByDate, notes }) =>
          children({
            itemsByDate,
            notes,
            onDayPress: sheet.open,
            onWorkoutPress: workout => openWorkout(workout.id),
            onActivityPress: activity => openActivity(activity.id),
            onRacePress: raceSheet.open,
            onNotePress: note => noteSheet.open(note.id),
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
        onNotePress={note => noteSheet.openFromDaySheet(note.id)}
      />

      <NoteDetailSheet sheet={noteSheet} />
      <RaceDetailSheet sheet={raceSheet} />
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
