import { useTranslation } from 'react-i18next';

import BottomSheet from '@/components/BottomSheet';
import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutTile from '@/components/WorkoutTile';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import type { CalendarDay } from '@/lib/calendarGrid';
import type { CalendarWorkout } from '@/lib/workoutStatus';

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
  const labels = useCalendarLabels();

  if (!day) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={labels.day(day)}
      testID="calendar-day-sheet"
    >
      {workouts.length === 0 ? (
        <Text variant="body-l-regular" color="textSecondary">
          {t('emptyDay')}
        </Text>
      ) : (
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
      )}
    </BottomSheet>
  );
}
