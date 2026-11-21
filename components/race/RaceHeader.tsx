import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import RacePriorityLabel from '@/components/race/RacePriorityLabel';
import { useAppTheme } from '@/constants/theme';
import type { Race } from '@/lib/races';
import { Ionicons } from '@expo/vector-icons';

export default function RaceHeader({
  race,
  onPress,
}: {
  race: Race;
  onPress: (race: Race) => void;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const label = t('activityDetails.raceHeader', {
    priority: t('race.priority', { priority: race.priority }),
    name: race.name,
  });

  return (
    <Pressable
      onPress={() => onPress(race)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      testID="race-header"
    >
      <SheenSurface padding="base" flexDirection="row" alignItems="center">
        <Box flex={1}>
          <RacePriorityLabel priority={race.priority} />
          <Text variant="body-l-semibold" numberOfLines={2} marginTop="xs">
            {race.name}
          </Text>
        </Box>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textTertiary}
          style={{ marginLeft: theme.spacing.xs }}
        />
      </SheenSurface>
    </Pressable>
  );
}
