import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import NoteCard from '@/components/NoteCard';
import NoteDetailSheet from '@/components/NoteDetailSheet';
import Text from '@/components/Text';
import WellnessCard from '@/components/home/WellnessCard';
import { useAppTheme } from '@/constants/theme';
import { useOpenActivityDetails } from '@/hooks/activity/useOpenActivityDetails';
import { useUpcomingWorkouts } from '@/hooks/home/useUpcomingWorkouts';
import { useWellness } from '@/hooks/home/useWellness';
import { useNoteSheet } from '@/hooks/useNoteSheet';
import { useOpenWorkoutDetails } from '@/hooks/workout/useOpenWorkoutDetails';
import type { Note } from '@/lib/notes';
import { upcomingItemKey } from '@/lib/upcomingWorkouts';

/**
 * Home: the Wellness card above "Dziś i jutro". Gates on availability like the
 * other Intervals-backed screens and branches on the raw query (ADR 0005).
 */
export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { availability, query, refetch } = useUpcomingWorkouts();
  const { state: wellness, refetch: refetchWellness } = useWellness();
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
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([refetch(), refetchWellness()]);
    } finally {
      setRefreshing(false);
    }
  }

  function body() {
    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    // Home has no error state: a failed fetch with nothing to show leaves it
    // blank.
    if (query.data === undefined && query.isError) return null;

    return (
      <Box gap="xl">
        <WellnessCard state={wellness} />

        <Box>
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
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.xl,
        }}
        refreshControl={
          availability === 'available' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
            />
          ) : undefined
        }
      >
        {body()}
      </ScrollView>

      <NoteDetailSheet sheet={noteSheet} />
    </Box>
  );
}
