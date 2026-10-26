import ActivityTile from '@/components/ActivityTile';
import WorkoutTile from '@/components/WorkoutTile';
import type { CalendarItem, UnplannedActivity } from '@/lib/calendarItems';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarItemTileProps {
  item: CalendarItem;
  /** Omitted where the surrounding screen already shows the day. */
  dayLabel?: string;
  /** Opens a Workout's details. */
  onWorkoutPress: (workout: CalendarWorkout) => void;
  /** Opens an Activity's details. A Strava Activity's tile isn't tappable. */
  onActivityPress: (activity: UnplannedActivity) => void;
}

/** The tile for one day item: a Workout with its status, or an Activity. */
export default function CalendarItemTile({
  item,
  dayLabel,
  onWorkoutPress,
  onActivityPress,
}: CalendarItemTileProps) {
  if (item.kind === 'activity') {
    const { activity } = item;

    return (
      <ActivityTile
        activity={activity}
        dayLabel={dayLabel}
        onPress={() => onActivityPress(activity)}
      />
    );
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
