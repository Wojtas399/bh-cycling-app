import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { formatActivityStart } from '@/lib/activityStart';
import type { LocalDateTimeString } from '@/lib/localDateTime';
import { sportIcon, sportLabel } from '@/lib/sportIcon';
import { Ionicons } from '@expo/vector-icons';

export interface ActivityDetailsHeroProps {
  /** The Activity's name, `null` to fall back to the sport label. */
  title: string | null;
  /** intervals.icu's sport type. */
  type: string;
  startLocal: LocalDateTimeString;
}

/**
 * The top of Activity Details, outside any card: a quiet sport line where
 * Workout Details has its status pill, the title and the start. The sport
 * line is read as its label, and not at all when the title already is it.
 */
export default function ActivityDetailsHero({
  title,
  type,
  startLocal,
}: ActivityDetailsHeroProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const sport = t(sportLabel(type));
  const start = formatActivityStart(startLocal, {
    weekdaysShort: t('note.weekdaysShort', { returnObjects: true }),
    monthsShort: t('note.monthsShort', { returnObjects: true }),
  });
  const titleIsSport = title === null;

  return (
    <Box gap="sm" paddingHorizontal="md">
      <Box
        flexDirection="row"
        alignItems="center"
        gap="xs"
        accessible={!titleIsSport}
        accessibilityLabel={sport}
        accessibilityElementsHidden={titleIsSport}
        importantForAccessibility={titleIsSport ? 'no-hide-descendants' : 'yes'}
      >
        <Ionicons
          name={sportIcon(type)}
          size={14}
          color={theme.colors.workoutDone}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text variant="body-xs-medium" color="textSecondary">
          {sport}
        </Text>
      </Box>
      <Text variant="h2">{title ?? sport}</Text>
      <Text
        variant="body-s-regular"
        color="textSecondary"
        accessibilityLabel={start.accessibilityLabel}
      >
        {start.text}
      </Text>
    </Box>
  );
}
