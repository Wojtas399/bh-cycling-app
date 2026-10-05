import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import { useAppTheme } from '@/constants/theme';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';
import { Ionicons } from '@expo/vector-icons';

export interface CalendarDaySheetProps {
  /** Whether the sheet is open. */
  visible: boolean;
  /**
   * The day to draw. Kept after the sheet closes so the content stays put
   * while it slides out; `null` only before the first open.
   */
  day: CalendarDay | null;
  workouts: CalendarWorkout[];
  onClose: () => void;
}

/**
 * Bottom sheet with one day's workouts, scrollable when there are several,
 * or an empty-state message on a rest day. Shows only what it's given — the
 * caller reads the day straight from data already on screen.
 */
export default function CalendarDaySheet({
  visible,
  day,
  workouts,
  onClose,
}: CalendarDaySheetProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const labels = useCalendarLabels();

  return (
    <Modal
      visible={visible}
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

        {day && (
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
              <Text variant="h3">{labels.day(day)}</Text>
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

            {workouts.length === 0 ? (
              <Text variant="body-l-regular" color="textSecondary">
                {t('emptyDay')}
              </Text>
            ) : (
              <ScrollView>
                <Box gap="md">
                  {workouts.map(workout => (
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
