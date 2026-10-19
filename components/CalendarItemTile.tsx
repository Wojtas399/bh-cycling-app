import ActivityTile from '@/components/ActivityTile';
import WorkoutTile from '@/components/WorkoutTile';
import type { CalendarItem } from '@/lib/calendarItems';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarItemTileProps {
  item: CalendarItem;
  /** Omitted where the surrounding screen already shows the day. */
  dayLabel?: string;
  /** Opens a Workout's details. Unplanned Activities are not tappable. */
  onWorkoutPress: (workout: CalendarWorkout) => void;
}

/** The tile for one day item: a Workout with its status, or an Activity. */
export default function CalendarItemTile({
  item,
  dayLabel,
  onWorkoutPress,
}: CalendarItemTileProps) {
  if (item.kind === 'activity') {
    return <ActivityTile activity={item.activity} dayLabel={dayLabel} />;
  }

  const { workout } = item;

  return (
    <WorkoutTile
      title={workout.name}
      dayLabel={dayLabel}
      status={workout.status}
      durationSeconds={workout.durationSeconds}
      blocks={workout.blocks}
      onPress={() => onWorkoutPress(workout)}
    />
  );
}
