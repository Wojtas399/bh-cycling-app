import 'react-native-reanimated';

import theme from '@/constants/theme';
import {
  DarkTheme,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';
import { ThemeProvider } from '@shopify/restyle';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ThemeProvider theme={theme}>
      <NavThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="light" />
      </NavThemeProvider>
    </ThemeProvider>
  );
}
