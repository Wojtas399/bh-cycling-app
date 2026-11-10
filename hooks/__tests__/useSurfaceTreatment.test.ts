import { AccessibilityInfo, Platform } from 'react-native';

import { useSurfaceTreatment } from '../useSurfaceTreatment';
import { renderHook, waitFor } from '@testing-library/react-native';

let mockLiquidGlassAvailable = false;

jest.mock('@/lib/liquidGlass', () => ({
  get liquidGlassAvailable() {
    return mockLiquidGlassAvailable;
  },
}));

describe('useSurfaceTreatment', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'ios';
    mockLiquidGlassAvailable = false;
  });

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  function settings({ reduceTransparency = false, increaseContrast = false }) {
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockResolvedValue(reduceTransparency);
    jest
      .spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled')
      .mockResolvedValue(increaseContrast);
  }

  it('turns a backdrop solid under Reduce Transparency without Liquid Glass', async () => {
    settings({ reduceTransparency: true });

    const { result } = await renderHook(() =>
      useSurfaceTreatment({ kind: 'backdrop' }),
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        paint: 'opaque',
        hairlineStrong: false,
      }),
    );
  });

  it('flattens Sheen under Increase Contrast', async () => {
    settings({ increaseContrast: true });

    const { result } = await renderHook(() =>
      useSurfaceTreatment({ kind: 'sheen' }),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ paint: 'flat', hairlineStrong: true }),
    );
  });

  it('draws a chrome control as native glass where Liquid Glass is available', async () => {
    mockLiquidGlassAvailable = true;
    settings({});

    const { result } = await renderHook(() =>
      useSurfaceTreatment({
        kind: 'control',
        placement: 'chrome',
        prominent: true,
      }),
    );

    expect(result.current).toEqual({ paint: 'native', prominent: true });
  });
});
