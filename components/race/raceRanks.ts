import type { AppTheme } from '@/constants/theme';
import type { RacePriority } from '@/lib/races';
import type { SportIconName } from '@/lib/sportIcon';

/** How a Race Priority is drawn wherever a Race shows. */
export interface RaceRank {
  /** The rank icon. */
  icon: SportIconName;
  /** The rank icon's colour: always the fixed Race red but for a C Race. */
  iconColor: keyof AppTheme['colors'];
  /**
   * The rank icon's size on a month-grid day, ranked like the tiles: a C
   * Race's flag is the smallest. Glyphs about twice a dot's size, so a red
   * flag or trophy never reads as a red "missed" dot.
   */
  gridIconSize: number;
  /** "Wyścig X" as a red uppercase eyebrow, rather than muted. */
  eyebrow: boolean;
}

/**
 * A red trophy for an A Race, a red flag for a B Race, a grey outlined flag
 * for a C Race; only an A Race's priority is a red eyebrow.
 */
export const RACE_RANKS: Record<RacePriority, RaceRank> = {
  A: { icon: 'trophy', iconColor: 'race', gridIconSize: 13, eyebrow: true },
  B: { icon: 'flag', iconColor: 'race', gridIconSize: 13, eyebrow: false },
  C: {
    icon: 'flag-outline',
    iconColor: 'textSecondary',
    gridIconSize: 11,
    eyebrow: false,
  },
};
