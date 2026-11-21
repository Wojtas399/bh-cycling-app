import type { AppTheme } from '@/constants/theme';
import type { RacePriority } from '@/lib/races';
import type { SportIconName } from '@/lib/sportIcon';

export interface RaceRank {
  icon: SportIconName;
  iconColor: keyof AppTheme['colors'];
  gridIconSize: number;
  priorityAsRedEyebrow: boolean;
}

export const RACE_RANKS: Record<RacePriority, RaceRank> = {
  A: {
    icon: 'trophy',
    iconColor: 'race',
    gridIconSize: 13,
    priorityAsRedEyebrow: true,
  },
  B: {
    icon: 'flag',
    iconColor: 'race',
    gridIconSize: 13,
    priorityAsRedEyebrow: false,
  },
  C: {
    icon: 'flag-outline',
    iconColor: 'textSecondary',
    gridIconSize: 11,
    priorityAsRedEyebrow: false,
  },
};
