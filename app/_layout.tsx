import { useEffect } from 'react';
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

SplashScreen.preventAutoHideAsync();
setupAppFocus();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  // Shift+M in `expo start`; a no-op in production builds.
  useReactQueryDevTools(queryClient);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {fontsLoaded && (
          <ThemeProvider theme={theme}>
            <NavThemeProvider value={DarkTheme}>
              <Stack screenOptions={{ headerShown: false }} />
              <StatusBar style="light" />
              {/* Outside the navigator, so toasts survive navigation. */}
              <ToastHost />
            </NavThemeProvider>
          </ThemeProvider>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
