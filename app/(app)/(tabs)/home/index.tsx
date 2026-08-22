import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpcomingWorkouts } from './useUpcomingWorkouts';
import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import {
  VariantA,
  VariantB,
  VariantC,
} from '@/components/prototypes/NoteCardVariants';
import {
  PrototypeSwitcher,
  usePrototypeVariant,
} from '@/components/prototypes/PrototypeSwitcher';
import { mockEntries } from '@/components/prototypes/notePrototypeMockData';
import { useAppTheme } from '@/constants/theme';
import { useLocalSearchParams } from 'expo-router';

// PROTOTYPE — throwaway, resolves Ticket "Prototype: how a note renders in
// the today/tomorrow section". Visit /home?notePrototype=1 in dev to compare
// variants. Remove this block (and components/prototypes/) once the design
// decision is captured. See prototype/UI.md's capture step.
const NOTE_PROTOTYPE_VARIANTS = [
  { key: 'A', label: 'Separate card, full text' },
  { key: 'B', label: 'Separate card, clamp + expand sheet' },
  { key: 'C', label: 'Merged into tile, formatted, clamped' },
];

function NotePrototypeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const variant = usePrototypeVariant(NOTE_PROTOTYPE_VARIANTS);

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      paddingHorizontal="lg"
      style={{ paddingTop: insets.top + theme.spacing.xl }}
    >
      <Text variant="h2">Today / Tomorrow</Text>
      {variant === 'A' && <VariantA entries={mockEntries} />}
      {variant === 'B' && <VariantB entries={mockEntries} />}
      {variant === 'C' && <VariantC entries={mockEntries} />}
      <PrototypeSwitcher variants={NOTE_PROTOTYPE_VARIANTS} current={variant} />
    </Box>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'home.upcomingWorkouts',
  });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const state = useUpcomingWorkouts();
  const params = useLocalSearchParams<{ notePrototype?: string }>();

  if (__DEV__ && params.notePrototype) {
    return <NotePrototypeScreen />;
  }

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
              blocks={workout.blocks}
            />
          </Box>
        ))}
    </Box>
  );
}
