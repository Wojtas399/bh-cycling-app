import WorkoutTile from '../WorkoutTile';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { render, screen } from '@testing-library/react-native';

function renderTile(props: React.ComponentProps<typeof WorkoutTile>) {
  return render(
    <ThemeProvider theme={theme}>
      <WorkoutTile {...props} />
    </ThemeProvider>,
  );
}

describe('WorkoutTile', () => {
  it('renders the title, day label, and formatted duration', async () => {
    await renderTile({
      title: 'Threshold intervals',
      dayLabel: 'Today',
      durationSeconds: 6600,
    });

    expect(screen.getByText('Threshold intervals')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('1h 50m')).toBeTruthy();
  });

  it('omits the duration when durationSeconds is absent', async () => {
    await renderTile({ title: 'Easy spin', dayLabel: 'Tomorrow' });

    expect(screen.getByText('Easy spin')).toBeTruthy();
    expect(screen.getByText('Tomorrow')).toBeTruthy();
    expect(screen.queryByTestId('workout-tile-duration')).toBeNull();
  });

  it('draws a status dot when given a status', async () => {
    await renderTile({ title: 'Easy spin', status: 'missed' });

    expect(screen.getByTestId('workout-status-dot-missed')).toBeTruthy();
  });

  it('omits the status dot and day label when neither is given', async () => {
    await renderTile({ title: 'Easy spin' });

    expect(screen.getByText('Easy spin')).toBeTruthy();
    expect(screen.queryByTestId(/^workout-status-dot-/)).toBeNull();
  });

  it('renders the workout profile when the workout has blocks', async () => {
    await renderTile({
      title: 'Threshold intervals',
      dayLabel: 'Today',
      durationSeconds: 6600,
      blocks: [
        { widthFraction: 0.5, minPct: 50, maxPct: 50, zone: 1 },
        { widthFraction: 0.5, minPct: 95, maxPct: 105, zone: 4 },
      ],
    });

    expect(screen.getByTestId('workout-profile')).toBeTruthy();
  });

  it('degrades to the title and duration when there are no blocks', async () => {
    await renderTile({
      title: 'Unstructured ride',
      dayLabel: 'Today',
      durationSeconds: 3600,
    });

    expect(screen.getByText('Unstructured ride')).toBeTruthy();
    expect(screen.getByText('1h')).toBeTruthy();
    expect(screen.queryByTestId('workout-profile')).toBeNull();
  });
});
