import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useCalendarLabels } from '@/components/calendar/useCalendarLabels';
import WorkoutStatusPill from '@/components/workout/WorkoutStatusPill';
import { fromLocalDateString } from '@/lib/localDate';
import type { WorkoutStatus } from '@/lib/workoutStatus';

export interface WorkoutDetailsHeroProps {
  status: WorkoutStatus;
  title: string;
  /** Local `YYYY-MM-DD` the Workout is scheduled on. */
  date: string;
}

const MONDAY_FIRST = [6, 0, 1, 2, 3, 4, 5]; // days since Monday, by Date#getDay()

/**
 * The top of Workout Details, outside any card: status pill, title and date,
 * then the red "not done" banner when the Workout was missed.
 */
export default function WorkoutDetailsHero({
  status,
  title,
  date,
}: WorkoutDetailsHeroProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const labels = useCalendarLabels();
  const day = fromLocalDateString(date);

  return (
    <Box gap="md">
      <Box gap="sm" paddingHorizontal="md">
        <WorkoutStatusPill status={status} />
        <Text variant="h2">{title}</Text>
        <Text variant="body-s-regular" color="textSecondary">
          {`${labels.day({
            date,
            dayOfMonth: day.getDate(),
            weekday: MONDAY_FIRST[day.getDay()],
            month: day.getMonth(),
            year: day.getFullYear(),
          })} ${day.getFullYear()}`}
        </Text>
      </Box>

      {status === 'missed' && (
        <Box backgroundColor="dangerDim" borderRadius="lg" padding="md">
          <Text variant="body-s-medium">{t('missedBanner')}</Text>
        </Box>
      )}
    </Box>
  );
}
