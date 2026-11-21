import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import theme from '@/constants/theme';
import { useAuthState } from '@/hooks/useAuthState';
import '@/i18n';
import { setupAppFocus } from '@/lib/appFocus';
import { queryClient } from '@/lib/queryClient';
import { hideSplashScreen } from '@/lib/splashScreen';
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

function keepSystemGlassSheetsAndAlertsDark() {
  Appearance.setColorScheme('dark');
}

keepSystemGlassSheetsAndAlertsDark();
SplashScreen.preventAutoHideAsync();
setupAppFocus();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  const authState = useAuthState();

  useReactQueryDevTools(queryClient);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={hideSplashScreen}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <NavThemeProvider value={DarkTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={authState === 'unknown'}>
                <Stack.Screen name="index" />
              </Stack.Protected>
              <Stack.Protected guard={authState === 'verified'}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected
                guard={authState === 'signedOut' || authState === 'unverified'}
              >
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
            </Stack>
            <StatusBar style="light" />
            <ToastHost />
          </NavThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
