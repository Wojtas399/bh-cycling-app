import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useNoteDateLabels } from '@/hooks/useNoteDateLabels';
import { formatActivityStart } from '@/lib/activityStart';
import type { LocalDateTimeString } from '@/lib/localDateTime';
import { sportIcon, sportLabel } from '@/lib/sportIcon';
import { Ionicons } from '@expo/vector-icons';

export interface ActivityDetailsHeroProps {
  title: string | null;
  sportType: string;
  startLocal: LocalDateTimeString;
}

export default function ActivityDetailsHero({
  title,
  sportType,
  startLocal,
}: ActivityDetailsHeroProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const dateLabels = useNoteDateLabels();
  const sport = t(sportLabel(sportType));
  const start = formatActivityStart(startLocal, dateLabels);
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
          name={sportIcon(sportType)}
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
