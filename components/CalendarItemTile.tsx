import ActivityTile from '@/components/ActivityTile';
import WorkoutTile from '@/components/WorkoutTile';
import RaceTile from '@/components/race/RaceTile';
import type { CalendarItem, UnplannedActivity } from '@/lib/calendarItems';
import type { Race } from '@/lib/races';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarItemTileProps {
  item: CalendarItem;
  /** Omitted where the surrounding screen already shows the day. */
  dayLabel?: string;
  /** Opens a Workout's details. */
  onWorkoutPress: (workout: CalendarWorkout) => void;
  /**
   * Opens an Activity's details, including a paired Race's Activity. A Strava
   * Activity's tile isn't tappable.
   */
  onActivityPress: (activity: UnplannedActivity) => void;
  /** Opens an unpaired Race's sheet. */
  onRacePress: (race: Race) => void;
}

/**
 * The tile for one day item: a Workout with its status, a Race ranked by its
 * priority, or an Activity. A paired Race opens its Activity, an unpaired one
 * its sheet.
 */
export default function CalendarItemTile({
  item,
  dayLabel,
  onWorkoutPress,
  onActivityPress,
  onRacePress,
}: CalendarItemTileProps) {
  if (item.kind === 'race') {
    const { race, activity } = item;

    return (
      <RaceTile
        item={item}
        dayLabel={dayLabel}
        onPress={
          activity ? () => onActivityPress(activity) : () => onRacePress(race)
        }
      />
    );
  }

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
      completedWithStravaActivity={workout.completedWithStravaActivity}
      onPress={() => onWorkoutPress(workout)}
    />
  );
}
