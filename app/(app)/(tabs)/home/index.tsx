import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView } from 'react-native';

import Box from '@/components/Box';
import CalendarItemTile from '@/components/CalendarItemTile';
import GlassHeader from '@/components/GlassHeader';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import NoteCard from '@/components/NoteCard';
import Text from '@/components/Text';
import NextRaceCard from '@/components/home/NextRaceCard';
import TodayCards from '@/components/home/TodayCards';
import RaceDetailSheet from '@/components/race/RaceDetailSheet';
import { useAppTheme } from '@/constants/theme';
import { useOpenActivityDetails } from '@/hooks/activity/useOpenActivityDetails';
import { useNextRace } from '@/hooks/home/useNextRace';
import { useTodayCards } from '@/hooks/home/useTodayCards';
import { useUpcomingWorkouts } from '@/hooks/home/useUpcomingWorkouts';
import { useOpenNoteDetails } from '@/hooks/note/useOpenNoteDetails';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useIntervalsRefresh } from '@/hooks/useIntervalsRefresh';
import { useRaceSheet } from '@/hooks/useRaceSheet';
import { useOpenWorkoutDetails } from '@/hooks/workout/useOpenWorkoutDetails';
import { upcomingItemKey } from '@/lib/upcomingWorkouts';

export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const { t: tTabs } = useTranslation(undefined, { keyPrefix: 'tabs' });
  const theme = useAppTheme();
  const header = useGlassHeader('tab');
  const { availability, query } = useUpcomingWorkouts();
  const { state: todayCards } = useTodayCards();
  const { next: nextRace } = useNextRace();
  const { refreshing, refresh } = useIntervalsRefresh();
  const openWorkout = useOpenWorkoutDetails();
  const openActivity = useOpenActivityDetails();
  const openNote = useOpenNoteDetails();
  const raceSheet = useRaceSheet();

  function body() {
    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    const failedWithNothingToShow = query.data === undefined && query.isError;

    if (failedWithNothingToShow) return null;

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
                  onPress={() => openNote(item.note.id)}
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
              onRefresh={refresh}
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

      <RaceDetailSheet sheet={raceSheet} />
    </Box>
  );
}
