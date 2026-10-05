import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export type CalendarBodyState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      workoutsByDate: Record<string, CalendarWorkout[]>;
    };

export interface CalendarBodyProps {
  state: CalendarBodyState;
  /** The loaded view, rendered in the scroll area once the state is ready. */
  children: (workoutsByDate: Record<string, CalendarWorkout[]>) => ReactNode;
}

/** The Calendar's content area: a spinner, an error message, or the loaded view. */
export default function CalendarBody({ state, children }: CalendarBodyProps) {
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
      return (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
          }}
        >
          {children(state.workoutsByDate)}
        </ScrollView>
      );
  }
}
