import { Text as RNText } from 'react-native';

import SettingsRow from '../SettingsRow';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { fireEvent, render, screen } from '@testing-library/react-native';

function renderRow(props: Partial<React.ComponentProps<typeof SettingsRow>>) {
  return render(
    <ThemeProvider theme={theme}>
      <SettingsRow
        icon="mail-outline"
        iconColor="accent"
        label="Label"
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('SettingsRow', () => {
  it('renders label, subtitle and value', async () => {
    await renderRow({ subtitle: 'Sub', value: 'Val' });

    expect(screen.getByText('Label')).toBeTruthy();
    expect(screen.getByText('Sub')).toBeTruthy();
    expect(screen.getByText('Val')).toBeTruthy();
  });

  it('is not a button and has no chevron without onPress', async () => {
    await renderRow({ value: 'Val' });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('settings-row-chevron')).toBeNull();
  });

  it('is a pressable button that calls onPress', async () => {
    const onPress = jest.fn();

    await renderRow({ onPress, trailing: 'chevron' });

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-row-chevron')).toBeTruthy();
  });

  it('renders the external glyph', async () => {
    await renderRow({ onPress: jest.fn(), trailing: 'external' });

    expect(screen.getByTestId('settings-row-external')).toBeTruthy();
  });

  it('renders a custom trailing node', async () => {
    await renderRow({ trailing: <RNText>Połącz</RNText> });

    expect(screen.getByText('Połącz')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('never shows a chevron on a danger row', async () => {
    await renderRow({ danger: true, onPress: jest.fn(), trailing: 'chevron' });

    expect(screen.queryByTestId('settings-row-chevron')).toBeNull();
  });

  it('replaces the trailing content with a spinner while loading', async () => {
    await renderRow({
      onPress: jest.fn(),
      trailing: 'chevron',
      loading: true,
    });

    expect(screen.queryByTestId('settings-row-chevron')).toBeNull();
    expect(screen.getByTestId('settings-row-loading')).toBeTruthy();
  });
});
