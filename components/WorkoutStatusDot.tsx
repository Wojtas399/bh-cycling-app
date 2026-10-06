import Box from '@/components/Box';
import type { AppTheme } from '@/constants/theme';
import type { WorkoutStatus } from '@/lib/workoutStatus';

const STATUS_COLORS: Record<WorkoutStatus, keyof AppTheme['colors']> = {
  completed: 'workoutDone',
  planned: 'workoutPlanned',
  missed: 'workoutMissed',
};

export interface WorkoutStatusDotProps {
  status: WorkoutStatus;
  size?: number;
}

/** A small dot in the Workout Status colour: green, gray, or red. */
export default function WorkoutStatusDot({
  status,
  size = 6,
}: WorkoutStatusDotProps) {
  return (
    <Box
      width={size}
      height={size}
      borderRadius="full"
      backgroundColor={STATUS_COLORS[status]}
      testID={`workout-status-dot-${status}`}
    />
  );
}
