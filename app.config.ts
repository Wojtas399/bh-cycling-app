import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withGradleProperties } from 'expo/config-plugins';
import type { ConfigPlugin } from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const FIREBASE_FILES: Record<string, string | undefined> = {
  'firebase/google-services.staging.json':
    process.env.GOOGLE_SERVICES_STAGING_JSON,
  'firebase/google-services.production.json':
    process.env.GOOGLE_SERVICES_PRODUCTION_JSON,
  'firebase/GoogleService-Info.staging.plist':
    process.env.GOOGLE_SERVICE_INFO_STAGING_PLIST,
  'firebase/GoogleService-Info.production.plist':
    process.env.GOOGLE_SERVICE_INFO_PRODUCTION_PLIST,
  'firebase/google-services.dev.json': process.env.GOOGLE_SERVICES_DEV_JSON,
  'firebase/GoogleService-Info.dev.plist':
    process.env.GOOGLE_SERVICE_INFO_DEV_PLIST,
};

for (const [dest, srcPath] of Object.entries(FIREBASE_FILES)) {
  if (srcPath && !fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(srcPath, dest);
  }
}

type AppEnv = 'production' | 'staging' | 'dev';

const IDENTITY: Record<AppEnv, { name: string; bundleId: string }> = {
  production: {
    name: 'BH Cycling',
    bundleId: 'com.wojtas.blackhorsecyclingapp',
  },
  staging: {
    name: 'BH Cycling (Staging)',
    bundleId: 'com.wojtas.blackhorsecyclingapp.staging',
  },
  dev: {
    name: 'BH Cycling (Dev)',
    bundleId: 'com.wojtas.blackhorsecyclingapp.dev',
  },
};

const isAppEnv = (env: string): env is AppEnv =>
  Object.keys(IDENTITY).includes(env);

const resolveAppEnv = (env = 'staging'): AppEnv => {
  if (!isAppEnv(env)) {
    throw new Error(
      `Unknown APP_ENV "${env}". Use production, staging or dev.`,
    );
  }

  return env;
};

const APP_ENV = resolveAppEnv(process.env.APP_ENV);
const identity = IDENTITY[APP_ENV];

const EAS_PROJECT_ID = 'a5a05625-f7f4-4b0c-89b8-72de6a9dbdd8';

// Slugs from the Sentry project's settings. They aren't secret. They stay
// literals, not env variables, because plugin options are part of the native
// fingerprint.
const SENTRY_ORGANIZATION_SLUG = 'wpiekle';
const SENTRY_PROJECT_SLUG = 'bh-cycling-app';

// The release build hangs on a Metaspace out-of-memory error with the
// template's 512m. Prebuild rewrites gradle.properties, so it's set here.
const GRADLE_JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1536m';

const withGradleMemory: ConfigPlugin = config =>
  withGradleProperties(config, gradle => {
    gradle.modResults = [
      ...gradle.modResults.filter(
        item => item.type !== 'property' || item.key !== 'org.gradle.jvmargs',
      ),
      { type: 'property', key: 'org.gradle.jvmargs', value: GRADLE_JVM_ARGS },
    ];

    return gradle;
  });

const appConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: identity.name,
  slug: 'black-horse-cycling-app',
  version: '0.2.0',
  orientation: 'portrait',
  // Here and below, icons and Firebase files are named after the env.
  icon: `./assets/images/icon-${APP_ENV}.png`,
  scheme: 'blackhorsecyclingapp',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'fingerprint' },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  ios: {
    icon: `./assets/icons/AppIcon-${APP_ENV}.icon`,
    supportsTablet: true,
    bundleIdentifier: identity.bundleId,
    googleServicesFile: `./firebase/GoogleService-Info.${APP_ENV}.plist`,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // MapLibre ships a location manager, so App Store Connect requires
      // this key even though the app never asks for location (ITMS-90683).
      NSLocationWhenInUseUsageDescription:
        'BH Cycling uses your location to show where you are on the ride map.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0A0A0A',
      foregroundImage: `./assets/images/android-foreground-${APP_ENV}.png`,
      monochromeImage: `./assets/images/android-monochrome-${APP_ENV}.png`,
    },
    predictiveBackGestureEnabled: false,
    package: identity.bundleId,
    googleServicesFile: `./firebase/google-services.${APP_ENV}.json`,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          // iOS 27 refuses to launch apps built with its SDK that don't use
          // the UIScene lifecycle. Opt-in on SDK 57, default from SDK 58.
          enableSceneSupport: true,
          forceStaticLinking: [
            'RNFBApp',
            'RNFBAuth',
            'RNFBFirestore',
            'RNFBFunctions',
          ],
        },
      },
    ],
    'expo-router',
    'expo-font',
    'expo-image',
    'expo-localization',
    'expo-status-bar',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#0A0A0A',
        dark: { backgroundColor: '#0A0A0A' },
      },
    ],
    'expo-build-properties',
    '@react-native-firebase/app',
    '@react-native-google-signin/google-signin',
    '@maplibre/maplibre-react-native',
    // The OTA source map upload in scripts/release.sh finds this entry by
    // its /expo name.
    [
      '@sentry/react-native/expo',
      {
        organization: SENTRY_ORGANIZATION_SLUG,
        project: SENTRY_PROJECT_SLUG,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv: APP_ENV,
    router: {},
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});

export default (context: ConfigContext): ExpoConfig =>
  withGradleMemory(appConfig(context));
