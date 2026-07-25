import HomeScreen from '../index';
import { useUpcomingWorkouts } from '../useUpcomingWorkouts';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { render, screen } from '@testing-library/react-native';

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
    <ThemeProvider theme={theme}>
      <HomeScreen />
    </ThemeProvider>,
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
        { id: 1, name: 'Intervals', dayLabel: 'today' },
        { id: 2, name: 'Endurance ride', dayLabel: 'tomorrow' },
      ],
    });

    await renderScreen();

    expect(screen.getByText('Intervals')).toBeTruthy();
    expect(screen.getByText('home.upcomingWorkouts.today')).toBeTruthy();
    expect(screen.getByText('Endurance ride')).toBeTruthy();
    expect(screen.getByText('home.upcomingWorkouts.tomorrow')).toBeTruthy();
  });
});
