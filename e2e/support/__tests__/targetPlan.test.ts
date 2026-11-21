import { planTargets } from '../targetPlan';

describe('planTargets', () => {
  it('runs both targets on the local default devices with no build ids', () => {
    expect(planTargets({})).toEqual([
      { platform: 'ios', device: 'BH e2e iPhone' },
      { platform: 'android', device: 'BH_e2e_Pixel' },
    ]);
  });

  it('runs a local target on the device E2E_*_DEVICE names', () => {
    const env = {
      E2E_IOS_DEVICE: 'iPhone 16e',
      E2E_ANDROID_DEVICE: 'Pixel_8_API_35',
    };

    expect(planTargets(env)).toEqual([
      { platform: 'ios', device: 'iPhone 16e' },
      { platform: 'android', device: 'Pixel_8_API_35' },
    ]);
  });

  it('runs iOS on an Expo Simulators iPhone 17 Pro from E2E_IOS_BUILD_ID, and Android locally', () => {
    expect(planTargets({ E2E_IOS_BUILD_ID: 'ios-build-1' })).toEqual([
      {
        platform: 'ios',
        expoSimulators: { buildId: 'ios-build-1', device: 'iPhone 17 Pro' },
        videoTouches: false,
      },
      { platform: 'android', device: 'BH_e2e_Pixel' },
    ]);
  });

  it('runs Android on an Expo Simulators pixel_9 from E2E_ANDROID_BUILD_ID, and iOS locally', () => {
    expect(planTargets({ E2E_ANDROID_BUILD_ID: 'android-build-1' })).toEqual([
      { platform: 'ios', device: 'BH e2e iPhone' },
      {
        platform: 'android',
        expoSimulators: { buildId: 'android-build-1', device: 'pixel_9' },
        videoTouches: false,
      },
    ]);
  });

  it('turns off drawn touches on every Expo Simulators target, since drawing them onto a hosted recording can outlast the cleanup timeout', () => {
    expect(
      planTargets({
        E2E_IOS_BUILD_ID: 'ios-build-3',
        E2E_ANDROID_BUILD_ID: 'android-build-3',
      }),
    ).toEqual([
      expect.objectContaining({ videoTouches: false }),
      expect.objectContaining({ videoTouches: false }),
    ]);
  });

  it('runs both targets on Expo Simulators with both build ids', () => {
    const env = {
      E2E_IOS_BUILD_ID: 'ios-build-2',
      E2E_ANDROID_BUILD_ID: 'android-build-2',
    };

    expect(planTargets(env)).toEqual([
      {
        platform: 'ios',
        expoSimulators: { buildId: 'ios-build-2', device: 'iPhone 17 Pro' },
        videoTouches: false,
      },
      {
        platform: 'android',
        expoSimulators: { buildId: 'android-build-2', device: 'pixel_9' },
        videoTouches: false,
      },
    ]);
  });
});
