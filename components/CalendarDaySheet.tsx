import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useAppTheme } from '@/constants/theme';
import { useCalendarLabels } from '@/hooks/useCalendarLabels';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';
import { Ionicons } from '@expo/vector-icons';

export interface CalendarDaySheetProps {
  /** The day to show; `null` keeps the sheet closed. */
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
      visible={day !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Box flex={1} justifyContent="flex-end">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
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
