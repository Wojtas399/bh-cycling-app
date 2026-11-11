import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import RacePriorityLabel from '@/components/race/RacePriorityLabel';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import { useAppTheme } from '@/constants/theme';
import type { RaceItem } from '@/lib/calendarItems';
import { raceItemMeta, raceTileLabel } from '@/lib/raceLabels';
import type { Race, RacePriority } from '@/lib/races';
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
  /** The muted line (see `raceItemMeta`). */
  meta: string;
  /** Paired to an Activity: draws a completed Workout's done marker. */
  completed: boolean;
}

/**
 * A Race ranked by size: an A Race is a hero tile with a red border, a B Race
 * a Workout-sized card, a C Race a slim row. Always the fixed Race red, never
 * the Race's own colour. A paired Race keeps its rank's tile, shows the
 * Activity's recorded figures and a completed Workout's done marker. Read as
 * one stop, by `raceTileLabel`.
 */
export default function RaceTile({ item, dayLabel, onPress }: RaceTileProps) {
  const { t } = useTranslation();
  const { race } = item;
  const priority = t('race.priority', { priority: race.priority });
  const sport = t(sportLabel(race.sport));
  const label = raceTileLabel(item, {
    priority,
    sport,
    completed: t('race.completed'),
  });
  const props: RankTileProps = {
    race,
    dayLabel,
    priority,
    meta: raceItemMeta(item, sport),
    completed: item.activity !== undefined,
  };

  const RankTile = RANK_TILES[race.priority];
  const tile = <RankTile {...props} />;

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
function HeroTile({ race, dayLabel, meta, completed }: RankTileProps) {
  const theme = useAppTheme();

  return (
    <SheenSurface
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
      <Box flexDirection="row" alignItems="center">
        {completed && <DoneMarker />}
        <Text variant="h3" numberOfLines={2} style={{ flex: 1 }}>
          {race.name}
        </Text>
      </Box>
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
    </SheenSurface>
  );
}

/** A B Race: a Workout-sized card with a red flag. */
function CardTile({
  race,
  dayLabel,
  priority,
  meta,
  completed,
}: RankTileProps) {
  return (
    <SheenSurface padding="base">
      <Box flexDirection="row" alignItems="center">
        {completed && <DoneMarker />}
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
    </SheenSurface>
  );
}

/**
 * A C Race: one line, not a card — a grey outlined flag, the name with its
 * muted meta, and "Wyścig C" on the right.
 */
function SlimRow({ race, dayLabel, priority, meta, completed }: RankTileProps) {
  return (
    <Box flexDirection="row" alignItems="center" padding="xs">
      {completed && <DoneMarker />}
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

/** Each rank's tile, from the A Race's hero down to the C Race's row. */
const RANK_TILES: Record<RacePriority, (props: RankTileProps) => ReactElement> =
  { A: HeroTile, B: CardTile, C: SlimRow };

/** A completed Workout's done marker, as `WorkoutTile` draws it. */
function DoneMarker() {
  return (
    <Box marginRight="sm">
      <WorkoutStatusDot status="completed" size={8} />
    </Box>
  );
}
