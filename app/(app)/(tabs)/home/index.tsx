import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpcomingEntries } from './useUpcomingEntries';
import Box from '@/components/Box';
import NoteCard from '@/components/NoteCard';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useAppTheme } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const state = useUpcomingEntries();

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
        state.entries.map(entry => (
          <Box key={entry.id} marginTop="md">
            {entry.kind === 'workout' ? (
              <WorkoutTile
                title={entry.name}
                dayLabel={t(entry.dayLabel)}
                durationSeconds={entry.durationSeconds}
                blocks={entry.blocks}
              />
            ) : (
              <NoteCard
                title={entry.title}
                dayLabel={t(entry.dayLabel)}
                text={entry.text}
              />
            )}
          </Box>
        ))}
    </Box>
  );
}
