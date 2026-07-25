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
});
