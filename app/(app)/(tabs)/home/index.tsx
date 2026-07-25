import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useUpcomingWorkouts } from './useUpcomingWorkouts';
import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const theme = useAppTheme();
  const state = useUpcomingWorkouts();

  if (state.status === 'hidden') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      paddingHorizontal="lg"
      paddingTop="xl"
    >
      <Text variant="h2">{t('title')}</Text>

      {state.status === 'loading' ? (
        <Box marginTop="md" testID="upcoming-workouts-loading">
          <ActivityIndicator color={theme.colors.textPrimary} />
        </Box>
      ) : null}

      {state.status === 'empty' ? (
        <Text variant="body-l-regular" color="textSecondary" marginTop="md">
          {t('empty')}
        </Text>
      ) : null}

      {state.status === 'ready'
        ? state.workouts.map(workout => (
            <Box
              key={workout.id}
              flexDirection="row"
              justifyContent="space-between"
              marginTop="md"
            >
              <Text variant="body-l-regular">{workout.name}</Text>
              <Text variant="body-s-regular" color="textSecondary">
                {t(workout.dayLabel)}
              </Text>
            </Box>
          ))
        : null}
    </Box>
  );
}
