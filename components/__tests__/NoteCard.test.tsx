import { SafeAreaProvider } from 'react-native-safe-area-context';

import NoteCard from '../NoteCard';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { fireEvent, render, screen } from '@testing-library/react-native';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderCard(props: React.ComponentProps<typeof NoteCard>) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider theme={theme}>
        <NoteCard {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const TEXT = 'Adjust saddle height.\nBring the mini pump.';

describe('NoteCard', () => {
  it('renders only the title and day label, not the full text', async () => {
    await renderCard({
      title: 'Bike check',
      dayLabel: 'Tomorrow',
      text: TEXT,
    });

    expect(screen.getByText('Bike check')).toBeTruthy();
    expect(screen.getByText('Tomorrow')).toBeTruthy();
    expect(screen.queryByText(TEXT)).toBeNull();
  });

  it('opens a detail sheet with the full text when tapped', async () => {
    await renderCard({
      title: 'Bike check',
      dayLabel: 'Tomorrow',
      text: TEXT,
    });

    await fireEvent.press(screen.getByTestId('note-card'));

    expect(screen.getByText(TEXT)).toBeTruthy();
  });

  it('closes the detail sheet when the backdrop is tapped', async () => {
    await renderCard({
      title: 'Bike check',
      dayLabel: 'Tomorrow',
      text: TEXT,
    });

    await fireEvent.press(screen.getByTestId('note-card'));
    expect(screen.getByText(TEXT)).toBeTruthy();

    await fireEvent.press(screen.getAllByLabelText('Close')[0]);

    expect(screen.queryByText(TEXT)).toBeNull();
  });
});
