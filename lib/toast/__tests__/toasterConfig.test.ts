import { toasterConfig } from '../ToastHost';

jest.mock('sonner-native', () => ({ Toaster: () => null, toast: {} }));

jest.mock('expo-glass-effect', () => ({
  GlassView: () => null,
  isLiquidGlassAvailable: () => false,
  isGlassEffectAPIAvailable: () => false,
}));

describe('toasterConfig', () => {
  it("shows toasts as a plain list, since sonner's collapsed stack pauses every timer on tap", () => {
    expect(toasterConfig.enableStacking).toBe(false);
  });

  it("titles a toast in Inter-Medium's own weight, not sonner's default 600 that Android fakes bold", () => {
    expect(toasterConfig.toastOptions.titleStyle.fontWeight).toBe('500');
  });
});
