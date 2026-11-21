type Platform = 'ios' | 'android';

export type TargetPlan =
  | { platform: Platform; device: string }
  | {
      platform: Platform;
      expoSimulators: { buildId: string; device: string };
      videoTouches: false;
    };

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

export function planTargets(
  env: Readonly<Record<string, string | undefined>>,
): TargetPlan[] {
  return PLATFORMS.map(platformConfig => {
    const buildId = env[platformConfig.buildIdVar];

    return buildId
      ? {
          platform: platformConfig.platform,
          expoSimulators: { buildId, device: platformConfig.cloudDevice },
          videoTouches: false,
        }
      : {
          platform: platformConfig.platform,
          device:
            env[platformConfig.localDeviceVar] ?? platformConfig.localDevice,
        };
  });
}
