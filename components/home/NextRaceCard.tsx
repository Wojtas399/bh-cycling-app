import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import type { NextRace } from '@/hooks/home/useNextRace';
import { formatShortDate } from '@/lib/noteDates';
import { raceTileMeta } from '@/lib/raceLabels';
import type { Race } from '@/lib/races';
import { sportLabel } from '@/lib/sportIcon';

/**
 * The countdown to the next Race at the top of Home: a big red "Dziś",
 * "Jutro" or number over "dni" on the left; the eyebrow, the name, and the
 * rank icon with "Wyścig X", the date and the meta on the right. It looks the
 * same for every priority but the icon. One button opening the Race.
 */
export default function NextRaceCard({
  next: { race, countdown },
  onPress,
}: {
  next: NextRace;
  onPress: (race: Race) => void;
}) {
  const { t } = useTranslation();
  const priority = t('race.priority', { priority: race.priority });
  const date = formatShortDate(race.date, {
    weekdaysShort: t('note.weekdaysShort', { returnObjects: true }),
    monthsShort: t('note.monthsShort', { returnObjects: true }),
  });
  const meta = raceTileMeta(race, t(sportLabel(race.sport)));
  const inDays = typeof countdown === 'number';
  const label = t('home.nextRace.accessibilityLabel', {
    priority,
    name: race.name,
    when: inDays
      ? t('home.nextRace.when.days', { days: countdown })
      : t(`home.nextRace.when.${countdown}`),
  });

  return (
    <Pressable
      onPress={() => onPress(race)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      testID="next-race-card"
    >
      <Box
        backgroundColor="bgSecondary"
        borderRadius="lg"
        padding="base"
        flexDirection="row"
        alignItems="center"
      >
        <Box
          alignItems="center"
          justifyContent="center"
          marginRight="base"
          style={{ minWidth: 64 }}
        >
          <Text
            variant={inDays ? 'display' : 'h3'}
            color="race"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {inDays ? countdown : t(`home.nextRace.${countdown}`)}
          </Text>
          {inDays && (
            <Text variant="body-xs-medium" color="textSecondary">
              {t('home.nextRace.days')}
            </Text>
          )}
        </Box>

        <Box flex={1}>
          <Text
            variant="body-xs-medium"
            color="textSecondary"
            style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
          >
            {t('home.nextRace.eyebrow')}
          </Text>
          <Text variant="body-l-semibold" numberOfLines={2} marginTop="xs">
            {race.name}
          </Text>
          <Box flexDirection="row" alignItems="center" marginTop="xs">
            <Box marginRight="xs">
              <RaceRankIcon priority={race.priority} size={12} />
            </Box>
            <Text
              variant="body-s-regular"
              color="textSecondary"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {[priority, date, meta].join(' · ')}
            </Text>
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
}
