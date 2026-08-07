import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../index';
import { useUpcomingWorkouts } from '../useUpcomingWorkouts';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { render, screen } from '@testing-library/react-native';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

jest.mock('react-i18next', () => ({
  useTranslation: (_ns?: string, options?: { keyPrefix?: string }) => ({
    t: (key: string) =>
      options?.keyPrefix ? `${options.keyPrefix}.${key}` : key,
  }),
}));

jest.mock('../useUpcomingWorkouts', () => ({
  useUpcomingWorkouts: jest.fn(),
}));

const mockUseUpcomingWorkouts = useUpcomingWorkouts as jest.Mock;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider theme={theme}>
        <HomeScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('HomeScreen — Upcoming Workouts section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when hidden', async () => {
    mockUseUpcomingWorkouts.mockReturnValue({ status: 'hidden' });

    await renderScreen();

    expect(screen.queryByText('home.upcomingWorkouts.title')).toBeNull();
  });

  it('shows a loading indicator while loading', async () => {
    mockUseUpcomingWorkouts.mockReturnValue({ status: 'loading' });

    await renderScreen();

    expect(screen.getByText('home.upcomingWorkouts.title')).toBeTruthy();
    expect(screen.getByTestId('upcoming-workouts-loading')).toBeTruthy();
  });

  it('shows an empty-state message when there are no matching workouts', async () => {
    mockUseUpcomingWorkouts.mockReturnValue({ status: 'empty' });

    await renderScreen();

    expect(screen.getByText('home.upcomingWorkouts.title')).toBeTruthy();
    expect(screen.getByText('home.upcomingWorkouts.empty')).toBeTruthy();
  });

  it('renders the list of workouts with relative day labels when ready', async () => {
    mockUseUpcomingWorkouts.mockReturnValue({
      status: 'ready',
      workouts: [
        { id: 1, name: 'Intervals', dayLabel: 'today', durationSeconds: 6600 },
        { id: 2, name: 'Endurance ride', dayLabel: 'tomorrow' },
      ],
    });

    await renderScreen();

    expect(screen.getByText('Intervals')).toBeTruthy();
    expect(screen.getByText('home.upcomingWorkouts.today')).toBeTruthy();
    expect(screen.getByText('1h 50m')).toBeTruthy();
    expect(screen.getByText('Endurance ride')).toBeTruthy();
    expect(screen.getByText('home.upcomingWorkouts.tomorrow')).toBeTruthy();
  });

  it('renders the workout profile on tiles that carry blocks', async () => {
    mockUseUpcomingWorkouts.mockReturnValue({
      status: 'ready',
      workouts: [
        {
          id: 1,
          name: 'Intervals',
          dayLabel: 'today',
          durationSeconds: 3600,
          blocks: [
            { widthFraction: 0.5, minPct: 50, maxPct: 50, zone: 1 },
            { widthFraction: 0.5, minPct: 95, maxPct: 105, zone: 4 },
          ],
        },
        { id: 2, name: 'Endurance ride', dayLabel: 'tomorrow' },
      ],
    });

    await renderScreen();

    // Only the workout with blocks draws a profile; the other degrades.
    expect(screen.getAllByTestId('workout-profile')).toHaveLength(1);
    expect(screen.getAllByTestId(/^workout-profile-bar-/)).toHaveLength(2);
    expect(screen.getByText('Endurance ride')).toBeTruthy();
  });
});
