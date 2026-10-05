import { useEffect } from 'react';
import 'react-native-reanimated';

import theme from '@/constants/theme';
import '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from '@shopify/restyle';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  ThemeProvider as NavThemeProvider,
  Stack,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider theme={theme}>
      <NavThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="light" />
      </NavThemeProvider>
    </ThemeProvider>
  );
}
