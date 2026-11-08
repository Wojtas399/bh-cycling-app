import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import RacePriorityLabel from '@/components/race/RacePriorityLabel';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import { useAppTheme } from '@/constants/theme';
import type { RaceItem } from '@/lib/calendarItems';
import { raceTileLabel, raceTileMeta } from '@/lib/raceLabels';
import type { Race } from '@/lib/races';
import { sportIcon, sportLabel } from '@/lib/sportIcon';
import { Ionicons } from '@expo/vector-icons';

export interface RaceTileProps {
  item: RaceItem;
  /** Omitted where the surrounding screen already shows the day. */
  dayLabel?: string;
  /** Opens the Race. Without it the tile isn't a button. */
  onPress?: () => void;
}

/** What each rank's tile draws. */
interface RankTileProps {
  race: Race;
  dayLabel?: string;
  /** "Wyścig X". */
  priority: string;
  /** The muted line (see `raceTileMeta`). */
  meta: string;
}

/**
 * A Race ranked by size: an A Race is a hero tile with a red border, a B Race
 * a Workout-sized card, a C Race a slim row. Always the fixed Race red, never
 * the Race's own colour. Read as one stop, by `raceTileLabel`.
 */
export default function RaceTile({ item, dayLabel, onPress }: RaceTileProps) {
  const { t } = useTranslation();
  const { race } = item;
  const priority = t('race.priority', { priority: race.priority });
  const sport = t(sportLabel(race.sport));
  const label = raceTileLabel(item, { priority, sport });
  const props: RankTileProps = {
    race,
    dayLabel,
    priority,
    meta: raceTileMeta(race, sport),
  };

  const tile =
    race.priority === 'A' ? (
      <HeroTile {...props} />
    ) : race.priority === 'B' ? (
      <CardTile {...props} />
    ) : (
      <SlimRow {...props} />
    );

  if (!onPress) {
    return (
      <Box accessible accessibilityLabel={label} testID="race-tile">
        {tile}
      </Box>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      testID="race-tile"
    >
      {tile}
    </Pressable>
  );
}

/** An A Race: taller than a Workout tile, red-bordered, the name on two lines. */
function HeroTile({ race, dayLabel, meta }: RankTileProps) {
  const theme = useAppTheme();

  return (
    <Box
      backgroundColor="bgSecondary"
      borderRadius="xl"
      borderWidth={1.5}
      borderColor="race"
      paddingVertical="lg"
      paddingHorizontal="base"
    >
      <Box flexDirection="row" alignItems="center" marginBottom="sm">
        <Box flex={1}>
          <RacePriorityLabel priority="A" />
        </Box>
        {dayLabel !== undefined && (
          <Text variant="body-s-regular" color="textSecondary">
            {dayLabel}
          </Text>
        )}
      </Box>
      <Text variant="h3" numberOfLines={2}>
        {race.name}
      </Text>
      <Box flexDirection="row" alignItems="center" marginTop="xs">
        <Box marginRight="xs">
          <Ionicons
            name={sportIcon(race.sport)}
            size={14}
            color={theme.colors.textSecondary}
          />
        </Box>
        <Text
          variant="body-s-regular"
          color="textSecondary"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {meta}
        </Text>
      </Box>
    </Box>
  );
}

/** A B Race: a Workout-sized card with a red flag. */
function CardTile({ race, dayLabel, priority, meta }: RankTileProps) {
  return (
    <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
      <Box flexDirection="row" alignItems="center">
        <Box marginRight="sm">
          <RaceRankIcon priority="B" size={16} />
        </Box>
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {race.name}
        </Text>
        {dayLabel !== undefined && (
          <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
            {dayLabel}
          </Text>
        )}
      </Box>
      <Text
        variant="body-s-regular"
        color="textSecondary"
        marginTop="xs"
        numberOfLines={1}
      >
        {`${priority} · ${meta}`}
      </Text>
    </Box>
  );
}

/**
 * A C Race: one line, not a card — a grey outlined flag, the name with its
 * muted meta, and "Wyścig C" on the right.
 */
function SlimRow({ race, dayLabel, priority, meta }: RankTileProps) {
  return (
    <Box flexDirection="row" alignItems="center" padding="xs">
      <Box marginRight="sm">
        <RaceRankIcon priority="C" size={14} />
      </Box>
      <Text variant="body-s-medium" numberOfLines={1} style={{ flex: 1 }}>
        {race.name}
        <Text variant="body-s-regular" color="textSecondary">
          {` · ${meta}`}
        </Text>
      </Text>
      <Text variant="body-xs-regular" color="textSecondary" marginLeft="sm">
        {dayLabel === undefined ? priority : `${priority} · ${dayLabel}`}
      </Text>
    </Box>
  );
}
