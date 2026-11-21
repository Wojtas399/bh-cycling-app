import ActivityTile from '@/components/ActivityTile';
import WorkoutTile from '@/components/WorkoutTile';
import RaceTile from '@/components/race/RaceTile';
import type { CalendarItem, UnplannedActivity } from '@/lib/calendarItems';
import type { Race } from '@/lib/races';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export interface CalendarItemTileProps {
  item: CalendarItem;
  dayLabel?: string;
  onWorkoutPress: (workout: CalendarWorkout) => void;
  onActivityPress: (activity: UnplannedActivity) => void;
  onRacePress: (race: Race) => void;
}

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
