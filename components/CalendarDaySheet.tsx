import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useAppTheme } from '@/constants/theme';
import { useCalendarLabels } from '@/hooks/useCalendarLabels';
import { useLastDefined } from '@/hooks/useLastDefined';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';
import { Ionicons } from '@expo/vector-icons';

export interface CalendarDaySelection {
  day: CalendarDay;
  workouts: CalendarWorkout[];
}

export interface CalendarDaySheetProps {
  /** The day to show; `null` keeps the sheet closed. */
  selection: CalendarDaySelection | null;
  onClose: () => void;
}

/**
 * Bottom sheet with one day's workouts, scrollable when there are several,
 * or an empty-state message on a rest day. Shows only what it's given — the
 * caller reads the day straight from data already on screen.
 */
export default function CalendarDaySheet({
  selection,
  onClose,
}: CalendarDaySheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const labels = useCalendarLabels();

  // Keep drawing the last selection while the sheet slides out, rather than
  // emptying it the moment `selection` goes back to `null`.
  const shown = useLastDefined(selection);

  return (
    <Modal
      visible={selection !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Box flex={1} justifyContent="flex-end">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.overlay },
          ]}
        />

        {shown && (
          <Box
            backgroundColor="bgTertiary"
            borderTopLeftRadius="2xl"
            borderTopRightRadius="2xl"
            paddingHorizontal="lg"
            paddingTop="lg"
            style={{
              maxHeight: '70%',
              paddingBottom: insets.bottom + theme.spacing.lg,
            }}
            testID="calendar-day-sheet"
          >
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              marginBottom="base"
            >
              <Text variant="h3">{labels.day(shown.day)}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('close')}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </Box>

            {shown.workouts.length === 0 ? (
              <Text variant="body-l-regular" color="textSecondary">
                {t('emptyDay')}
              </Text>
            ) : (
              <ScrollView>
                <Box gap="md">
                  {shown.workouts.map(workout => (
                    <WorkoutTile
                      key={workout.id}
                      title={workout.name}
                      status={workout.status}
                      durationSeconds={workout.durationSeconds}
                      blocks={workout.blocks}
                    />
                  ))}
                </Box>
              </ScrollView>
            )}
          </Box>
        )}
      </Box>
    </Modal>
  );
}
