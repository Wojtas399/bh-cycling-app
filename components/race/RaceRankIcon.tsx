import { RACE_RANKS } from '@/components/race/raceRanks';
import { useAppTheme } from '@/constants/theme';
import type { RacePriority } from '@/lib/races';
import { Ionicons } from '@expo/vector-icons';

export default function RaceRankIcon({
  priority,
  size,
}: {
  priority: RacePriority;
  size: number;
}) {
  const theme = useAppTheme();
  const { icon, iconColor } = RACE_RANKS[priority];

  return (
    <Ionicons
      name={icon}
      size={size}
      color={theme.colors[iconColor]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
