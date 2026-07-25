import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpcomingWorkouts } from './useUpcomingWorkouts';
import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useAppTheme } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const state = useUpcomingWorkouts();

  if (state.status === 'hidden') {
    return <Box flex={1} backgroundColor="bgPrimary" />;
  }

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      paddingHorizontal="lg"
      style={{ paddingTop: insets.top + theme.spacing.xl }}
    >
      <Text variant="h2">{t('title')}</Text>

      {state.status === 'loading' && (
        <Box marginTop="md" testID="upcoming-workouts-loading">
          <ActivityIndicator color={theme.colors.textPrimary} />
        </Box>
      )}

      {state.status === 'empty' && (
        <Text variant="body-l-regular" color="textSecondary" marginTop="md">
          {t('empty')}
        </Text>
      )}

      {state.status === 'ready' &&
        state.workouts.map(workout => (
          <Box key={workout.id} marginTop="md">
            <WorkoutTile
              title={workout.name}
              dayLabel={t(workout.dayLabel)}
              durationSeconds={workout.durationSeconds}
            />
          </Box>
        ))}
    </Box>
  );
}
