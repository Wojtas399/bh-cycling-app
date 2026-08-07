import { StyleSheet } from 'react-native';

import WorkoutProfile from '../WorkoutProfile';
import theme from '@/constants/theme';
import type { WorkoutBlock } from '@/lib/workoutProfile';
import { ThemeProvider } from '@shopify/restyle';
import { render, screen } from '@testing-library/react-native';

/** Ceiling of 100% FTP, so every bar height reads directly as its %FTP. */
const BLOCKS: WorkoutBlock[] = [
  { widthFraction: 0.5, minPct: 40, maxPct: 40, zone: 1 },
  { widthFraction: 0.3, minPct: 80, maxPct: 100, zone: 4 },
  { widthFraction: 0.2, minPct: 60, maxPct: 60, zone: 2 },
];

function renderProfile(blocks: WorkoutBlock[]) {
  return render(
    <ThemeProvider theme={theme}>
      <WorkoutProfile blocks={blocks} />
    </ThemeProvider>,
  );
}

function styleOf(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe('WorkoutProfile', () => {
  it('renders one bar per block, in the order it is given', async () => {
    await renderProfile(BLOCKS);

    expect(screen.getAllByTestId(/^workout-profile-bar-/)).toHaveLength(3);
  });

  it('gives each block a width in proportion to its widthFraction', async () => {
    await renderProfile(BLOCKS);

    expect(styleOf('workout-profile-block-0').flexGrow).toBe(0.5);
    expect(styleOf('workout-profile-block-1').flexGrow).toBe(0.3);
    expect(styleOf('workout-profile-block-2').flexGrow).toBe(0.2);
  });

  it('scales bar heights against the tallest block, which fills the profile', async () => {
    await renderProfile(BLOCKS);

    expect(styleOf('workout-profile-bar-0').height).toBe('40%');
    expect(styleOf('workout-profile-bar-1').height).toBe('100%');
    expect(styleOf('workout-profile-bar-2').height).toBe('60%');
  });

  it('caps a range block over the span between its minPct and maxPct', async () => {
    await renderProfile(BLOCKS);

    // 80–100% FTP: the top fifth of a bar that reaches the 100% ceiling.
    expect(styleOf('workout-profile-cap-1').height).toBe('20%');
  });

  it('leaves a flat block with no cap above its solid fill', async () => {
    await renderProfile(BLOCKS);

    expect(styleOf('workout-profile-cap-0').height).toBe('0%');
    expect(styleOf('workout-profile-cap-2').height).toBe('0%');
  });

  it('draws the cap lighter than the solid fill below it', async () => {
    await renderProfile(BLOCKS);

    const cap = styleOf('workout-profile-cap-1');
    const solid = styleOf('workout-profile-solid-1');

    expect(cap.backgroundColor).toBe(solid.backgroundColor);
    expect(cap.opacity).toBeGreaterThan(0);
    expect(cap.opacity).toBeLessThan(1);
  });

  it('colours each block by its zone, from the theme zone tokens', async () => {
    await renderProfile(BLOCKS);

    expect(styleOf('workout-profile-solid-0').backgroundColor).toBe(
      theme.colors.zone1,
    );
    expect(styleOf('workout-profile-solid-1').backgroundColor).toBe(
      theme.colors.zone4,
    );
    expect(styleOf('workout-profile-solid-2').backgroundColor).toBe(
      theme.colors.zone2,
    );
  });

  it('rounds the top of each bar and separates the bars with a gap', async () => {
    await renderProfile(BLOCKS);

    const bar = styleOf('workout-profile-bar-0');

    expect(bar.borderTopLeftRadius).toBeGreaterThan(0);
    expect(bar.borderTopRightRadius).toBeGreaterThan(0);
    expect(styleOf('workout-profile').gap).toBeGreaterThan(0);
  });

  it('flattens a block that asks for no power at all', async () => {
    await renderProfile([
      { widthFraction: 0.5, minPct: 0, maxPct: 0, zone: 1 },
      { widthFraction: 0.5, minPct: 100, maxPct: 100, zone: 4 },
    ]);

    expect(styleOf('workout-profile-bar-0').height).toBe('0%');
    expect(styleOf('workout-profile-cap-0').height).toBe('0%');
  });

  it('renders nothing when there are no blocks to draw', async () => {
    await renderProfile([]);

    expect(screen.queryByTestId('workout-profile')).toBeNull();
  });
});
