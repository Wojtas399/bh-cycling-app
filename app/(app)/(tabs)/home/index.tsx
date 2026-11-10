import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView } from 'react-native';

import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import GlassHeader from '@/components/GlassHeader';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import NoteCard from '@/components/NoteCard';
import NoteDetailSheet from '@/components/NoteDetailSheet';
import Text from '@/components/Text';
import NextRaceCard from '@/components/home/NextRaceCard';
import TodayCards from '@/components/home/TodayCards';
import RaceDetailSheet from '@/components/race/RaceDetailSheet';
import { useAppTheme } from '@/constants/theme';
import { useOpenActivityDetails } from '@/hooks/activity/useOpenActivityDetails';
import { useNextRace } from '@/hooks/home/useNextRace';
import { useTodayCards } from '@/hooks/home/useTodayCards';
import { useUpcomingWorkouts } from '@/hooks/home/useUpcomingWorkouts';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useNoteSheet } from '@/hooks/useNoteSheet';
import { useRaceSheet } from '@/hooks/useRaceSheet';
import { useOpenWorkoutDetails } from '@/hooks/workout/useOpenWorkoutDetails';
import type { Note } from '@/lib/notes';
import { upcomingItemKey } from '@/lib/upcomingWorkouts';

/**
 * Home: the next-race card, then the Fitness and Wellness cards, above "Dziś
 * i jutro". Gates on availability like the other Intervals-backed screens.
 * "Dziś i jutro" branches on the raw query (ADR 0005); the cards render the
 * state `useTodayCards` hands them (ADR 0010). The next-race card shows only
 * once a Race has loaded, with no placeholder or error state. The title
 * stays in a sticky Glass header that the content scrolls under.
 */
export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const { t: tTabs } = useTranslation(undefined, { keyPrefix: 'tabs' });
  const theme = useAppTheme();
  const header = useGlassHeader('tab');
  const { availability, query, refetch } = useUpcomingWorkouts();
  const { state: todayCards, refetch: refetchTodayCards } = useTodayCards();
  const { next: nextRace, refetch: refetchNextRace } = useNextRace();
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
  const raceSheet = useRaceSheet();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([refetch(), refetchTodayCards(), refetchNextRace()]);
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
        {nextRace && <NextRaceCard next={nextRace} onPress={raceSheet.open} />}

        <TodayCards state={todayCards} />

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
                  onRacePress={raceSheet.open}
                />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScrollView
        {...header.scrollViewProps}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: header.scrollInsetTop + theme.spacing.xl,
          paddingBottom: theme.spacing.xl,
        }}
        refreshControl={
          availability === 'available' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
              progressViewOffset={header.scrollInsetTop}
            />
          ) : undefined
        }
      >
        {body()}
      </ScrollView>

      <GlassHeader onLayout={header.onLayout}>
        <Box paddingHorizontal="lg" paddingTop="sm" paddingBottom="md">
          <Text variant="h2">{tTabs('home')}</Text>
        </Box>
      </GlassHeader>

      <NoteDetailSheet sheet={noteSheet} />
      <RaceDetailSheet sheet={raceSheet} />
    </Box>
  );
}
