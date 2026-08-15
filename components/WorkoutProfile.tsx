import Box from '@/components/Box';
import type { AppTheme } from '@/constants/theme';
import type { Zone } from '@/lib/powerZones';
import { type WorkoutBlock, profileCeilingPct } from '@/lib/workoutProfile';

/** Height of the plot area. Tall enough to read a shape, short enough for a tile. */
const PROFILE_HEIGHT = 48;

/** Hairline between neighbouring blocks, so repeated efforts stay countable. */
const BLOCK_GAP = 2;

/**
 * How visible the cap is against its solid fill. Enough to read the range as
 * part of the same effort, faint enough that the eye still lands on `minPct` —
 * the power the athlete is actually asked to hold.
 */
const CAP_OPACITY = 0.4;

const ZONE_COLORS: Record<Zone, keyof AppTheme['colors']> = {
  1: 'zone1',
  2: 'zone2',
  3: 'zone3',
  4: 'zone4',
  5: 'zone5',
  6: 'zone6',
  7: 'zone7',
};

export interface WorkoutProfileProps {
  /** The profile's blocks, in time order. */
  blocks: WorkoutBlock[];
}

/**
 * Draws a Workout Profile: one bar per block, in time order, its width its
 * share of the session and its height the power it asks for. A block with a
 * range is drawn solid up to `minPct` and capped to `maxPct`, so the bar states
 * the floor of the effort and hints at its ceiling.
 *
 * Purely presentational — it knows the block model and the theme, and nothing
 * about intervals.icu, FTP watts, or how the blocks were parsed.
 */
export default function WorkoutProfile({ blocks }: WorkoutProfileProps) {
  const ceilingPct = profileCeilingPct(blocks);

  // Nothing to scale against, and nothing to draw: an empty profile, or one
  // whose every block sits on the floor. Also keeps the divisor below safe.
  if (ceilingPct <= 0) return null;

  return (
    <Box
      flexDirection="row"
      alignItems="stretch"
      height={PROFILE_HEIGHT}
      style={{ gap: BLOCK_GAP }}
      testID="workout-profile"
    >
      {blocks.map((block, index) => {
        const color = ZONE_COLORS[block.zone];

        return (
          <Box
            // Blocks have no identity of their own: they are positions in a
            // time-ordered list that is replaced wholesale, never reordered or
            // spliced, so the index is the stable identity here.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            justifyContent="flex-end"
            flexGrow={block.widthFraction}
            flexBasis={0}
            testID={`workout-profile-block-${index}`}
          >
            <Box
              borderTopLeftRadius="sm"
              borderTopRightRadius="sm"
              overflow="hidden"
              style={{ height: `${(block.maxPct / ceilingPct) * 100}%` }}
              testID={`workout-profile-bar-${index}`}
            >
              {/* The bar is split between the range above `minPct` and the
                  solid fill below it, in proportion to the power each stands
                  for — the same idiom the widths above are drawn with. */}
              <Box
                backgroundColor={color}
                opacity={CAP_OPACITY}
                flexGrow={block.maxPct - block.minPct}
                flexBasis={0}
                testID={`workout-profile-cap-${index}`}
              />
              <Box
                backgroundColor={color}
                flexGrow={block.minPct}
                flexBasis={0}
                testID={`workout-profile-solid-${index}`}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
