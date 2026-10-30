import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
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
}

/** The Calendar's content area: a spinner, an error message, or the loaded view. */
export default function CalendarBody({
  state,
  children,
  fill = false,
}: CalendarBodyProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();

  switch (state.status) {
    case 'loading':
      return (
        <Box marginTop="md" testID="calendar-loading">
          <ActivityIndicator color={theme.colors.textPrimary} />
        </Box>
      );
    case 'error':
      return (
        <Text
          variant="body-l-regular"
          color="textSecondary"
          textAlign="center"
          marginTop="md"
          paddingHorizontal="lg"
        >
          {t('error')}
        </Text>
      );
    case 'ready':
      if (fill) return <Box flex={1}>{children(state.data)}</Box>;

      return (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
          }}
        >
          {children(state.data)}
        </ScrollView>
      );
  }
}
