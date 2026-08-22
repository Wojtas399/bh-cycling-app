import NoteCard from '../NoteCard';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { render, screen } from '@testing-library/react-native';

function renderCard(props: React.ComponentProps<typeof NoteCard>) {
  return render(
    <ThemeProvider theme={theme}>
      <NoteCard {...props} />
    </ThemeProvider>,
  );
}

describe('NoteCard', () => {
  it('renders the title, day label, and full text', async () => {
    await renderCard({
      title: 'Wzornik żywienia na zgrupowanie',
      dayLabel: 'Tomorrow',
      text: 'Adjust saddle height.\nBring the mini pump.',
    });

    expect(screen.getByText('Wzornik żywienia na zgrupowanie')).toBeTruthy();
    expect(screen.getByText('Tomorrow')).toBeTruthy();
    expect(
      screen.getByText('Adjust saddle height.\nBring the mini pump.'),
    ).toBeTruthy();
  });
});
