type Platform = 'ios' | 'android';

/**
 * One platform's e2e target: a local simulator or emulator by name, or an
 * Expo Simulators device that installs the EAS build `buildId`.
 */
export type TargetPlan =
  | { platform: Platform; device: string }
  | {
      platform: Platform;
      expoSimulators: { buildId: string; device: string };
      videoTouches: false;
    };

/**
 * Where each platform runs: the env var with its EAS build id, the fixed
 * Expo Simulators device, and the env var that overrides the local device.
 */
const PLATFORMS = [
  {
    platform: 'ios',
    buildIdVar: 'E2E_IOS_BUILD_ID',
    cloudDevice: 'iPhone 17 Pro',
    localDeviceVar: 'E2E_IOS_DEVICE',
    localDevice: 'BH e2e iPhone',
  },
  {
    platform: 'android',
    buildIdVar: 'E2E_ANDROID_BUILD_ID',
    cloudDevice: 'pixel_9',
    localDeviceVar: 'E2E_ANDROID_DEVICE',
    localDevice: 'BH_e2e_Pixel',
  },
] as const;

/**
 * Picks where each platform's e2e target runs, from the env. A platform with
 * an EAS build id runs on Expo Simulators; one without runs on today's local
 * simulator or emulator, so `npm run e2e:ios|android` is unchanged.
 */
export function planTargets(
  env: Readonly<Record<string, string | undefined>>,
): TargetPlan[] {
  return PLATFORMS.map(platformConfig => {
    const buildId = env[platformConfig.buildIdVar];

    return buildId
      ? {
          platform: platformConfig.platform,
          expoSimulators: { buildId, device: platformConfig.cloudDevice },
          // Drawing touches onto a hosted recording can outlast the cleanup timeout.
          videoTouches: false,
        }
      : {
          platform: platformConfig.platform,
          device:
            env[platformConfig.localDeviceVar] ?? platformConfig.localDevice,
        };
  });
}
