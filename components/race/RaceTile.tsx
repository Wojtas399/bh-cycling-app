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
  dayLabel?: string;
  onPress?: () => void;
}

interface RankTileProps {
  race: Race;
  dayLabel?: string;
  priorityLabel: string;
  meta: string;
  completed: boolean;
}

export default function RaceTile({ item, dayLabel, onPress }: RaceTileProps) {
  const { t } = useTranslation();
  const { race } = item;
  const priorityLabel = t('race.priority', { priority: race.priority });
  const sport = t(sportLabel(race.sport));
  const label = raceTileLabel(item, {
    priority: priorityLabel,
    sport,
    completed: t('race.completed'),
  });
  const props: RankTileProps = {
    race,
    dayLabel,
    priorityLabel,
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

function ARaceHeroTile({ race, dayLabel, meta, completed }: RankTileProps) {
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

function BRaceCardTile({
  race,
  dayLabel,
  priorityLabel,
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
        {`${priorityLabel} · ${meta}`}
      </Text>
    </SheenSurface>
  );
}

function CRaceSlimRow({
  race,
  dayLabel,
  priorityLabel,
  meta,
  completed,
}: RankTileProps) {
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
        {dayLabel === undefined
          ? priorityLabel
          : `${priorityLabel} · ${dayLabel}`}
      </Text>
    </Box>
  );
}

const RANK_TILES: Record<RacePriority, (props: RankTileProps) => ReactElement> =
  { A: ARaceHeroTile, B: BRaceCardTile, C: CRaceSlimRow };

function DoneMarker() {
  return (
    <Box marginRight="sm">
      <WorkoutStatusDot status="completed" size={8} />
    </Box>
  );
}
