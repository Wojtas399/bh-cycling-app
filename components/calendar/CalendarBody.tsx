import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import type { GlassHeaderLayout } from '@/hooks/useGlassHeader';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
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
  children: (data: CalendarData) => ReactNode;
  fillWithoutScrollOrPadding?: boolean;
  header: GlassHeaderLayout;
}

export default function CalendarBody({
  state,
  children,
  fillWithoutScrollOrPadding = false,
  header,
}: CalendarBodyProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();
  const tabBarClearance = useTabBarClearance();
  const gapUnderHeader = theme.spacing.base;
  const belowHeader = header.height + gapUnderHeader;

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
      if (fillWithoutScrollOrPadding) {
        return (
          <Box
            flex={1}
            style={{
              paddingTop: belowHeader,
              paddingBottom: tabBarClearance,
            }}
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
            paddingTop: header.scrollInsetTop + gapUnderHeader,
            paddingBottom: theme.spacing.xl,
          }}
        >
          {children(state.data)}
        </ScrollView>
      );
  }
}
