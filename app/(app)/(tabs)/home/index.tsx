import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useAppTheme } from '@/constants/theme';
import { useUpcomingWorkouts } from '@/hooks/home/useUpcomingWorkouts';

export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { availability, query } = useUpcomingWorkouts();

  // Home has no error state: like a disconnect, any failed fetch hides it.
  if (
    availability === 'unavailable' ||
    (query.data === undefined && query.isError)
  ) {
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

      {query.data === undefined && (
        <Box marginTop="md" testID="upcoming-workouts-loading">
          <ActivityIndicator color={theme.colors.textPrimary} />
        </Box>
      )}

      {query.data?.length === 0 && (
        <Text variant="body-l-regular" color="textSecondary" marginTop="md">
          {t('empty')}
        </Text>
      )}

      {query.data?.map(workout => (
        <Box key={workout.id} marginTop="md">
          <WorkoutTile
            title={workout.name}
            dayLabel={t(workout.dayLabel)}
            durationSeconds={workout.durationSeconds}
            blocks={workout.blocks}
          />
        </Box>
      ))}
    </Box>
  );
}
