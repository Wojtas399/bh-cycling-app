import WorkoutTile from '@/components/WorkoutTile';
import type { CalendarWorkout } from '@/lib/workoutStatus';

/** A `WorkoutTile` for one Calendar workout: its name, status, duration and profile. */
export default function CalendarWorkoutTile({
  workout,
}: {
  workout: CalendarWorkout;
}) {
  return (
    <WorkoutTile
      title={workout.name}
      status={workout.status}
      durationSeconds={workout.durationSeconds}
      blocks={workout.blocks}
    />
  );
}
