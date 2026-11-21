import type * as LiquidGlassModule from '../liquidGlass';
import { loadFreshModule } from '@/test-utils/loadFreshModule';

const mockIsLiquidGlassAvailable = jest.fn<boolean, []>();
const mockIsGlassEffectAPIAvailable = jest.fn<boolean, []>();

jest.mock('expo-glass-effect', () => ({
  GlassView: () => null,
  isLiquidGlassAvailable: () => mockIsLiquidGlassAvailable(),
  isGlassEffectAPIAvailable: () => mockIsGlassEffectAPIAvailable(),
}));

function loadLiquidGlassAvailable(): boolean {
  return loadFreshModule(() =>
    jest.requireActual<typeof LiquidGlassModule>('../liquidGlass'),
  ).liquidGlassAvailable;
}

describe('liquidGlassAvailable', () => {
  it('is available where iOS reports Liquid Glass and has the glass API', () => {
    mockIsLiquidGlassAvailable.mockReturnValue(true);
    mockIsGlassEffectAPIAvailable.mockReturnValue(true);

    expect(loadLiquidGlassAvailable()).toBe(true);
  });

  it('is unavailable on an iOS 26 beta that reports Liquid Glass without the glass API, where GlassView crashes', () => {
    mockIsLiquidGlassAvailable.mockReturnValue(true);
    mockIsGlassEffectAPIAvailable.mockReturnValue(false);

    expect(loadLiquidGlassAvailable()).toBe(false);
  });

  it('is unavailable before iOS 26', () => {
    mockIsLiquidGlassAvailable.mockReturnValue(false);
    mockIsGlassEffectAPIAvailable.mockReturnValue(false);

    expect(loadLiquidGlassAvailable()).toBe(false);
  });
});
