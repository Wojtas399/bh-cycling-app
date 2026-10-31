import type { ConfigContext, ExpoConfig } from 'expo/config';
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
};

for (const [dest, srcPath] of Object.entries(FIREBASE_FILES)) {
  if (srcPath && !fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(srcPath, dest);
  }
}

const APP_ENV = process.env.APP_ENV ?? 'staging';
const IS_PRODUCTION = APP_ENV === 'production';

const BUNDLE_ID = IS_PRODUCTION
  ? 'com.wojtas.blackhorsecyclingapp'
  : 'com.wojtas.blackhorsecyclingapp.staging';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PRODUCTION ? 'BH Cycling' : 'BH Cycling (Staging)',
  slug: 'black-horse-cycling-app',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'blackhorsecyclingapp',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    googleServicesFile: IS_PRODUCTION
      ? './firebase/GoogleService-Info.production.plist'
      : './firebase/GoogleService-Info.staging.plist',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: BUNDLE_ID,
    googleServicesFile: IS_PRODUCTION
      ? './firebase/google-services.production.json'
      : './firebase/google-services.staging.json',
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
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#000000' },
      },
    ],
    'expo-build-properties',
    '@react-native-firebase/app',
    '@react-native-google-signin/google-signin',
    '@maplibre/maplibre-react-native',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv: APP_ENV,
    router: {},
    eas: {
      projectId: 'a5a05625-f7f4-4b0c-89b8-72de6a9dbdd8',
    },
  },
});
