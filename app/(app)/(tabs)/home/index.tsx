import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import NoteCard from '@/components/NoteCard';
import NoteDetailSheet from '@/components/NoteDetailSheet';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useOpenActivityDetails } from '@/hooks/activity/useOpenActivityDetails';
import { useUpcomingWorkouts } from '@/hooks/home/useUpcomingWorkouts';
import { useNoteSheet } from '@/hooks/useNoteSheet';
import { useOpenWorkoutDetails } from '@/hooks/workout/useOpenWorkoutDetails';
import type { Note } from '@/lib/notes';
import { upcomingItemKey } from '@/lib/upcomingWorkouts';

export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { availability, query } = useUpcomingWorkouts();
  const openWorkout = useOpenWorkoutDetails();
  const openActivity = useOpenActivityDetails();
  const notes = useMemo(
    () =>
      query.data?.flatMap((item): Note[] =>
        item.kind === 'note' ? [item.note] : [],
      ),
    [query.data],
  );
  const noteSheet = useNoteSheet(notes);

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

      {query.data?.map(item => (
        <Box key={upcomingItemKey(item)} marginTop="md">
          {item.kind === 'note' ? (
            <NoteCard
              note={item.note}
              when={t(item.dayLabel)}
              onPress={() => noteSheet.open(item.note.id)}
            />
          ) : (
            <CalendarItemTile
              item={item}
              dayLabel={t(item.dayLabel)}
              onWorkoutPress={workout => openWorkout(workout.id)}
              onActivityPress={activity => openActivity(activity.id)}
            />
          )}
        </Box>
      ))}

      <NoteDetailSheet sheet={noteSheet} />
    </Box>
  );
}
