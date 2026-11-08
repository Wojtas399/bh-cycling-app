import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import RacePriorityLabel from '@/components/race/RacePriorityLabel';
import { useAppTheme } from '@/constants/theme';
import type { Race } from '@/lib/races';
import { Ionicons } from '@expo/vector-icons';

/**
 * The Race an Activity is paired to, on top of Activity Details: its priority
 * drawn as on the tile, then its name. One button opening the Race.
 */
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
      <Box
        backgroundColor="bgSecondary"
        borderRadius="lg"
        padding="base"
        flexDirection="row"
        alignItems="center"
      >
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
      </Box>
    </Pressable>
  );
}
