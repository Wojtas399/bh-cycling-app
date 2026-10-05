import { SafeAreaProvider } from 'react-native-safe-area-context';

import CalendarScreen from '../index';
import { useMonthlyCalendar } from '../useMonthlyCalendar';
import { useWeeklyCalendar } from '../useWeeklyCalendar';
import theme from '@/constants/theme';
import '@/i18n';
import { toLocalDateString } from '@/lib/localDate';
import type { CalendarWorkout } from '@/lib/workoutStatus';
import { ThemeProvider } from '@shopify/restyle';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

jest.mock('../useMonthlyCalendar', () => ({
  useMonthlyCalendar: jest.fn(),
}));

jest.mock('../useWeeklyCalendar', () => ({
  useWeeklyCalendar: jest.fn(),
}));

const mockUseMonthlyCalendar = useMonthlyCalendar as jest.Mock;
const mockUseWeeklyCalendar = useWeeklyCalendar as jest.Mock;

const OCTOBER_2026 = new Date(2026, 9, 1);
const WEEK_OF_5_OCT_2026 = new Date(2026, 9, 5);

function workout(overrides: Partial<CalendarWorkout>): CalendarWorkout {
  return {
    id: 1,
    name: 'Workout',
    date: '2026-10-05',
    status: 'planned',
    blocks: [],
    ...overrides,
  };
}

function datesBetween(first: Date, last: Date): string[] {
  const dates: string[] = [];

  for (
    let day = new Date(first);
    day <= last;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  ) {
    dates.push(toLocalDateString(day));
  }

  return dates;
}

/** What the hooks hand over: every day of the range, `[]` when empty. */
function workoutsByDate(
  dates: string[],
  workouts: CalendarWorkout[],
): Record<string, CalendarWorkout[]> {
  return Object.fromEntries(
    dates.map(date => [date, workouts.filter(w => w.date === date)]),
  );
}

const octoberDates = datesBetween(OCTOBER_2026, new Date(2026, 9, 31));
const weekDates = datesBetween(WEEK_OF_5_OCT_2026, new Date(2026, 9, 11));

function mockMonthly(overrides: Record<string, unknown> = {}) {
  const result = {
    state: { status: 'ready', workoutsByDate: {}, refreshing: false },
    month: OCTOBER_2026,
    goToPreviousMonth: jest.fn(),
    goToNextMonth: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  };

  mockUseMonthlyCalendar.mockReturnValue(result);

  return result;
}

function mockWeekly(overrides: Record<string, unknown> = {}) {
  const result = {
    state: { status: 'ready', workoutsByDate: {}, refreshing: false },
    week: WEEK_OF_5_OCT_2026,
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  };

  mockUseWeeklyCalendar.mockReturnValue(result);

  return result;
}

function ready(workouts: CalendarWorkout[], dates = octoberDates) {
  return {
    status: 'ready',
    workoutsByDate: workoutsByDate(dates, workouts),
    refreshing: false,
  };
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider theme={theme}>
        <CalendarScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMonthly();
    mockWeekly();
  });

  describe('screen states', () => {
    it('renders nothing when hidden', async () => {
      mockMonthly({ state: { status: 'hidden' } });

      await renderScreen();

      expect(screen.queryByText('Miesięczny')).toBeNull();
      expect(screen.queryByText('Październik 2026')).toBeNull();
    });

    it('shows the header and a loading indicator while loading', async () => {
      mockMonthly({ state: { status: 'loading' } });

      await renderScreen();

      expect(screen.getByText('Październik 2026')).toBeTruthy();
      expect(screen.getByTestId('calendar-loading')).toBeTruthy();
    });

    it('shows an error message when the range could not be fetched', async () => {
      mockMonthly({ state: { status: 'error' } });

      await renderScreen();

      expect(
        screen.getByText('Nie udało się wczytać kalendarza.'),
      ).toBeTruthy();
    });
  });

  describe('monthly view', () => {
    it('is the default view, titled with the visible month', async () => {
      await renderScreen();

      expect(screen.getByText('Październik 2026')).toBeTruthy();
      expect(screen.getByTestId('calendar-month-grid')).toBeTruthy();
      expect(mockUseWeeklyCalendar).not.toHaveBeenCalled();
    });

    it('shows one status dot per workout, coloured by status', async () => {
      mockMonthly({
        state: ready([
          workout({ id: 1, date: '2026-10-05', status: 'completed' }),
          workout({ id: 2, date: '2026-10-07', status: 'missed' }),
          workout({ id: 3, date: '2026-10-07', status: 'planned' }),
        ]),
      });

      await renderScreen();

      const fifth = screen.getByTestId('calendar-day-2026-10-05');
      const seventh = screen.getByTestId('calendar-day-2026-10-07');
      const sixth = screen.getByTestId('calendar-day-2026-10-06');

      expect(
        within(fifth).getAllByTestId('workout-status-dot-completed'),
      ).toHaveLength(1);
      expect(
        within(seventh).getAllByTestId(/^workout-status-dot-/),
      ).toHaveLength(2);
      expect(
        within(seventh).getByTestId('workout-status-dot-missed'),
      ).toBeTruthy();
      expect(
        within(seventh).getByTestId('workout-status-dot-planned'),
      ).toBeTruthy();
      expect(within(sixth).queryAllByTestId(/^workout-status-dot-/)).toEqual(
        [],
      );
    });

    it("marks today's cell", async () => {
      const now = new Date();
      const month = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = toLocalDateString(now);

      mockMonthly({ month, state: ready([], [today]) });

      await renderScreen();

      expect(
        within(screen.getByTestId(`calendar-day-${today}`)).getByTestId(
          'calendar-today',
        ),
      ).toBeTruthy();
      expect(screen.getAllByTestId('calendar-today')).toHaveLength(1);
    });

    it('renders days outside the month dimmed and not tappable', async () => {
      mockMonthly({ state: ready([]) });

      await renderScreen();

      // October 2026 starts on a Thursday; the grid opens on Monday 28 Sep.
      await fireEvent.press(screen.getByTestId('calendar-day-2026-09-28'));

      expect(screen.queryByTestId('calendar-day-sheet')).toBeNull();
    });

    it('navigates to the previous and next month', async () => {
      const monthly = mockMonthly();

      await renderScreen();

      await fireEvent.press(screen.getByLabelText('Poprzedni'));
      await fireEvent.press(screen.getByLabelText('Następny'));

      expect(monthly.goToPreviousMonth).toHaveBeenCalledTimes(1);
      expect(monthly.goToNextMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe('weekly view', () => {
    async function renderWeekly() {
      await renderScreen();
      await fireEvent.press(screen.getByText('Tygodniowy'));
    }

    it('switches to the weekly agenda, titled with the visible week', async () => {
      await renderWeekly();

      expect(screen.getByText('5 – 11 października 2026')).toBeTruthy();
      expect(screen.queryByTestId('calendar-month-grid')).toBeNull();
      expect(screen.getByTestId('calendar-week-agenda')).toBeTruthy();
    });

    it('titles a week spanning two months with both month names', async () => {
      mockWeekly({ week: new Date(2026, 8, 28) });

      await renderWeekly();

      expect(
        screen.getByText('28 września – 4 października 2026'),
      ).toBeTruthy();
    });

    it('shows each day label, with workout cards only on days that have them', async () => {
      mockWeekly({
        state: ready(
          [
            workout({
              id: 1,
              name: 'Threshold',
              date: '2026-10-06',
              status: 'completed',
              durationSeconds: 3600,
            }),
          ],
          weekDates,
        ),
      });

      await renderWeekly();

      expect(screen.getByText('Poniedziałek, 5 października')).toBeTruthy();
      expect(screen.getByText('Niedziela, 11 października')).toBeTruthy();

      const tuesday = screen.getByTestId('calendar-day-2026-10-06');

      expect(within(tuesday).getByText('Threshold')).toBeTruthy();
      expect(within(tuesday).getByText('1h')).toBeTruthy();
      expect(
        within(tuesday).getByTestId('workout-status-dot-completed'),
      ).toBeTruthy();
      expect(
        within(screen.getByTestId('calendar-day-2026-10-05')).queryByText(
          'Threshold',
        ),
      ).toBeNull();
    });

    it('navigates to the previous and next week', async () => {
      const weekly = mockWeekly();

      await renderWeekly();

      await fireEvent.press(screen.getByLabelText('Poprzedni'));
      await fireEvent.press(screen.getByLabelText('Następny'));

      expect(weekly.goToPreviousWeek).toHaveBeenCalledTimes(1);
      expect(weekly.goToNextWeek).toHaveBeenCalledTimes(1);
    });

    it('switches back to the monthly grid', async () => {
      await renderWeekly();
      await fireEvent.press(screen.getByText('Miesięczny'));

      expect(screen.getByTestId('calendar-month-grid')).toBeTruthy();
    });
  });

  describe('day sheet', () => {
    it('opens with the tapped day’s workouts from the monthly grid', async () => {
      mockMonthly({
        state: ready([workout({ id: 1, name: 'VO2 max', date: '2026-10-07' })]),
      });

      await renderScreen();
      await fireEvent.press(screen.getByTestId('calendar-day-2026-10-07'));

      const sheet = screen.getByTestId('calendar-day-sheet');

      expect(within(sheet).getByText('Środa, 7 października')).toBeTruthy();
      expect(within(sheet).getByText('VO2 max')).toBeTruthy();
      expect(
        within(sheet).getByTestId('workout-status-dot-planned'),
      ).toBeTruthy();
    });

    it('lists every workout when the day has several', async () => {
      mockMonthly({
        state: ready([
          workout({ id: 1, name: 'Morning spin', date: '2026-10-07' }),
          workout({ id: 2, name: 'Evening intervals', date: '2026-10-07' }),
        ]),
      });

      await renderScreen();
      await fireEvent.press(screen.getByTestId('calendar-day-2026-10-07'));

      const sheet = screen.getByTestId('calendar-day-sheet');

      expect(within(sheet).getByText('Morning spin')).toBeTruthy();
      expect(within(sheet).getByText('Evening intervals')).toBeTruthy();
    });

    it('shows an empty state for a day without workouts', async () => {
      mockMonthly({ state: ready([]) });

      await renderScreen();
      await fireEvent.press(screen.getByTestId('calendar-day-2026-10-08'));

      expect(
        within(screen.getByTestId('calendar-day-sheet')).getByText(
          'Brak treningów w tym dniu.',
        ),
      ).toBeTruthy();
    });

    it('opens from the weekly agenda too', async () => {
      mockWeekly({
        state: ready(
          [workout({ id: 1, name: 'Endurance', date: '2026-10-10' })],
          weekDates,
        ),
      });

      await renderScreen();
      await fireEvent.press(screen.getByText('Tygodniowy'));
      await fireEvent.press(screen.getByTestId('calendar-day-2026-10-10'));

      const sheet = screen.getByTestId('calendar-day-sheet');

      expect(within(sheet).getByText('Sobota, 10 października')).toBeTruthy();
      expect(within(sheet).getByText('Endurance')).toBeTruthy();
    });

    it('closes', async () => {
      mockMonthly({ state: ready([]) });

      await renderScreen();
      await fireEvent.press(screen.getByTestId('calendar-day-2026-10-08'));
      await fireEvent.press(screen.getByLabelText('Zamknij'));

      expect(screen.queryByTestId('calendar-day-sheet')).toBeNull();
    });
  });

  describe('refresh', () => {
    it('refreshes the visible view', async () => {
      const monthly = mockMonthly();

      await renderScreen();
      await fireEvent.press(screen.getByLabelText('Odśwież'));

      expect(monthly.refresh).toHaveBeenCalledTimes(1);
    });

    it('keeps the data on screen with an in-place indicator while refreshing', async () => {
      mockMonthly({
        state: {
          ...ready([workout({ id: 1, date: '2026-10-05' })]),
          refreshing: true,
        },
      });

      await renderScreen();

      expect(screen.getByTestId('calendar-refreshing')).toBeTruthy();
      expect(screen.queryByTestId('calendar-loading')).toBeNull();
      expect(
        within(screen.getByTestId('calendar-day-2026-10-05')).getByTestId(
          'workout-status-dot-planned',
        ),
      ).toBeTruthy();
    });
  });
});
