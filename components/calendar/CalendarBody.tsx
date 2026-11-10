import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import type { GlassHeaderLayout } from '@/hooks/useGlassHeader';
import { useTabBarFade } from '@/hooks/useTabBarFade';
import type { CalendarData } from '@/lib/calendarWorkouts';

export type CalendarBodyState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      data: CalendarData;
    };

export interface CalendarBodyProps {
  state: CalendarBodyState;
  /** The loaded view, rendered once the state is ready. */
  children: (data: CalendarData) => ReactNode;
  /**
   * The loaded view fills the body instead of scrolling, and lays out its
   * own padding (the month grid sizes its rows to the space).
   */
  fill?: boolean;
  /** The sticky header the body starts under. */
  header: GlassHeaderLayout;
}

/**
 * The Calendar's content area: a spinner, an error message, or the loaded
 * view. It starts under the sticky header and ends clear of the tab bar's
 * fade; a scrolling view scrolls under both.
 */
export default function CalendarBody({
  state,
  children,
  fill = false,
  header,
}: CalendarBodyProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();
  const fade = useTabBarFade();
  const belowHeader = header.height + theme.spacing.md;

  switch (state.status) {
    case 'loading':
      return (
        <Box style={{ marginTop: belowHeader }} testID="calendar-loading">
          <ActivityIndicator color={theme.colors.textPrimary} />
        </Box>
      );
    case 'error':
      return (
        <Text
          variant="body-l-regular"
          color="textSecondary"
          textAlign="center"
          paddingHorizontal="lg"
          style={{ marginTop: belowHeader }}
        >
          {t('error')}
        </Text>
      );
    case 'ready':
      if (fill) {
        return (
          <Box
            flex={1}
            style={{ paddingTop: header.height, paddingBottom: fade.height }}
          >
            {children(state.data)}
          </Box>
        );
      }

      return (
        <ScrollView
          {...header.scrollViewProps}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: header.scrollInsetTop,
            paddingBottom: fade.scrollInsetBottom,
          }}
        >
          {children(state.data)}
        </ScrollView>
      );
  }
}
