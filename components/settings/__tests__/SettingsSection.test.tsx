import SettingsSection from '../SettingsSection';
import Text from '@/components/Text';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { render, screen } from '@testing-library/react-native';

function renderSection(
  props: Partial<React.ComponentProps<typeof SettingsSection>>,
  children: React.ReactNode,
) {
  return render(
    <ThemeProvider theme={theme}>
      <SettingsSection {...props}>{children}</SettingsSection>
    </ThemeProvider>,
  );
}

describe('SettingsSection', () => {
  it('renders the title, children and footer', async () => {
    await renderSection(
      { title: 'Konto', footer: 'Footer text' },
      <Text>Row</Text>,
    );

    expect(screen.getByText('Konto')).toBeTruthy();
    expect(screen.getByText('Row')).toBeTruthy();
    expect(screen.getByText('Footer text')).toBeTruthy();
  });

  it('omits the header and footer when not provided', async () => {
    await renderSection({}, <Text>Row</Text>);

    expect(screen.getByText('Row')).toBeTruthy();
    expect(screen.queryByTestId('settings-section-title')).toBeNull();
    expect(screen.queryByTestId('settings-section-footer')).toBeNull();
  });

  it('draws dividers between children only', async () => {
    await renderSection({}, [
      <Text key="a">A</Text>,
      <Text key="b">B</Text>,
      <Text key="c">C</Text>,
    ]);

    expect(screen.getAllByTestId('settings-section-divider')).toHaveLength(2);
  });

  it('skips falsy children when placing dividers', async () => {
    await renderSection({}, [
      <Text key="a">A</Text>,
      false,
      null,
      <Text key="b">B</Text>,
    ]);

    expect(screen.getAllByTestId('settings-section-divider')).toHaveLength(1);
  });

  it('draws no divider for a single row', async () => {
    await renderSection({}, <Text>A</Text>);

    expect(screen.queryByTestId('settings-section-divider')).toBeNull();
  });
});
