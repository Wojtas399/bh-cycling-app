import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import theme from '@/constants/theme';
import '@/i18n';
import { setupAppFocus } from '@/lib/appFocus';
import { queryClient } from '@/lib/queryClient';
import { ToastHost } from '@/lib/toast/ToastHost';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from '@shopify/restyle';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  ThemeProvider as NavThemeProvider,
  Stack,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// The app is dark only, so system glass, sheets and alerts never turn light.
// `userInterfaceStyle: 'dark'` in the app config does the same from launch,
// once a store build carries it.
Appearance.setColorScheme('dark');
SplashScreen.preventAutoHideAsync();
setupAppFocus();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  // Shift+M in `expo start`; a no-op in production builds.
  useReactQueryDevTools(queryClient);

  // The splash stays up until the root view has laid out with fonts loaded,
  // so the app never shows a blank frame.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
      onLayout={() => SplashScreen.hideAsync()}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <NavThemeProvider value={DarkTheme}>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="light" />
            {/* Outside the navigator, so toasts survive navigation. */}
            <ToastHost />
          </NavThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
