import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import { useAppTheme } from '@/constants/theme';
import type { StravaActivitySummary } from '@/lib/workoutDetails';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export interface WorkoutStravaCardProps {
  activity: StravaActivitySummary;
}

/**
 * Wykonanie for a Workout completed by a Strava Activity: what is known (its
 * source and start time), why there is nothing more, and a link to Strava.
 */
export default function WorkoutStravaCard({
  activity,
}: WorkoutStravaCardProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.stravaActivity',
  });
  const theme = useAppTheme();

  return (
    <WorkoutDetailsCard title={t('title')}>
      <Box flexDirection="row" alignItems="center" gap="sm">
        {/* A neutral source mark, not an imitation of Strava's logo. */}
        <Ionicons
          name="cloud-download-outline"
          size={18}
          color={theme.colors.textSecondary}
        />
        <Text variant="body-l-semibold">{t('source')}</Text>
      </Box>
      <Text variant="body-s-regular" color="textSecondary" marginTop="xs">
        {t('startTime', { time: activity.startTime })}
      </Text>
      <Text variant="body-s-regular" color="textSecondary" marginTop="md">
        {t('noData')}
      </Text>
      <Pressable
        onPress={() =>
          WebBrowser.openBrowserAsync(
            `https://www.strava.com/activities/${activity.id}`,
          )
        }
        accessibilityRole="link"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          marginTop="md"
          paddingTop="md"
          borderTopWidth={1}
          borderColor="borderDefault"
        >
          <Text variant="body-s-medium">{t('openOnStrava')}</Text>
          <Ionicons
            name="open-outline"
            size={18}
            color={theme.colors.textTertiary}
          />
        </Box>
      </Pressable>
    </WorkoutDetailsCard>
  );
}
