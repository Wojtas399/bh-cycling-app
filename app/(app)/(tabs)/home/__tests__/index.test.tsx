import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../index';
import { useUpcomingEntries } from '../useUpcomingEntries';
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

jest.mock('../useUpcomingEntries', () => ({
  useUpcomingEntries: jest.fn(),
}));

const mockUseUpcomingEntries = useUpcomingEntries as jest.Mock;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider theme={theme}>
        <HomeScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('HomeScreen — Upcoming Entries section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when hidden', async () => {
    mockUseUpcomingEntries.mockReturnValue({ status: 'hidden' });

    await renderScreen();

    expect(screen.queryByText('home.upcomingWorkouts.title')).toBeNull();
  });

  it('shows a loading indicator while loading', async () => {
    mockUseUpcomingEntries.mockReturnValue({ status: 'loading' });

    await renderScreen();

    expect(screen.getByText('home.upcomingWorkouts.title')).toBeTruthy();
    expect(screen.getByTestId('upcoming-workouts-loading')).toBeTruthy();
  });

  it('shows an empty-state message when there are no matching entries', async () => {
    mockUseUpcomingEntries.mockReturnValue({ status: 'empty' });

    await renderScreen();

    expect(screen.getByText('home.upcomingWorkouts.title')).toBeTruthy();
    expect(screen.getByText('home.upcomingWorkouts.empty')).toBeTruthy();
  });

  it('renders the list of workouts with relative day labels when ready', async () => {
    mockUseUpcomingEntries.mockReturnValue({
      status: 'ready',
      entries: [
        {
          kind: 'workout',
          id: 1,
          name: 'Intervals',
          dayLabel: 'today',
          durationSeconds: 6600,
          blocks: [],
        },
        {
          kind: 'workout',
          id: 2,
          name: 'Endurance ride',
          dayLabel: 'tomorrow',
          blocks: [],
        },
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
    mockUseUpcomingEntries.mockReturnValue({
      status: 'ready',
      entries: [
        {
          kind: 'workout',
          id: 1,
          name: 'Intervals',
          dayLabel: 'today',
          durationSeconds: 3600,
          blocks: [
            { widthFraction: 0.5, minPct: 50, maxPct: 50, zone: 1 },
            { widthFraction: 0.5, minPct: 95, maxPct: 105, zone: 4 },
          ],
        },
        {
          kind: 'workout',
          id: 2,
          name: 'Endurance ride',
          dayLabel: 'tomorrow',
          blocks: [],
        },
      ],
    });

    await renderScreen();

    // Only the workout with blocks draws a profile; the other degrades.
    expect(screen.getAllByTestId('workout-profile')).toHaveLength(1);
    expect(screen.getAllByTestId(/^workout-profile-bar-/)).toHaveLength(2);
    expect(screen.getByText('Endurance ride')).toBeTruthy();
  });

  it('renders a note entry as a NoteCard alongside a workout', async () => {
    mockUseUpcomingEntries.mockReturnValue({
      status: 'ready',
      entries: [
        {
          kind: 'workout',
          id: 1,
          name: 'Intervals',
          dayLabel: 'today',
          blocks: [],
        },
        {
          kind: 'note',
          id: 2,
          title: 'Bike check',
          text: 'Adjust saddle height.',
          dayLabel: 'today',
        },
      ],
    });

    await renderScreen();

    expect(screen.getByText('Intervals')).toBeTruthy();
    expect(screen.getByText('Bike check')).toBeTruthy();
    expect(screen.queryByText('Adjust saddle height.')).toBeNull();
  });

  it('renders a note-only day with no workout above it', async () => {
    mockUseUpcomingEntries.mockReturnValue({
      status: 'ready',
      entries: [
        {
          kind: 'note',
          id: 1,
          title: 'Route change',
          text: 'Meet at the north gate.',
          dayLabel: 'tomorrow',
        },
      ],
    });

    await renderScreen();

    expect(screen.getByText('Route change')).toBeTruthy();
    expect(screen.queryByText('Meet at the north gate.')).toBeNull();
    expect(screen.queryByTestId('workout-profile')).toBeNull();
  });

  it('renders multiple same-day notes as separate cards', async () => {
    mockUseUpcomingEntries.mockReturnValue({
      status: 'ready',
      entries: [
        {
          kind: 'note',
          id: 1,
          title: 'First note',
          text: 'Note A',
          dayLabel: 'tomorrow',
        },
        {
          kind: 'note',
          id: 2,
          title: 'Second note',
          text: 'Note B',
          dayLabel: 'tomorrow',
        },
      ],
    });

    await renderScreen();

    expect(screen.getByText('First note')).toBeTruthy();
    expect(screen.getByText('Second note')).toBeTruthy();
  });
});
