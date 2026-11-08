import { useAppTheme } from '@/constants/theme';
import type { RacePriority } from '@/lib/races';
import type { SportIconName } from '@/lib/sportIcon';
import { Ionicons } from '@expo/vector-icons';

const ICONS: Record<RacePriority, SportIconName> = {
  A: 'trophy',
  B: 'flag',
  C: 'flag-outline',
};

/**
 * A Race Priority's rank icon: a red trophy for A, a red flag for B, a grey
 * outlined flag for C. Decorative: whatever shows it also says the priority.
 */
export default function RaceRankIcon({
  priority,
  size,
}: {
  priority: RacePriority;
  size: number;
}) {
  const theme = useAppTheme();

  return (
    <Ionicons
      name={ICONS[priority]}
      size={size}
      color={priority === 'C' ? theme.colors.textSecondary : theme.colors.race}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
