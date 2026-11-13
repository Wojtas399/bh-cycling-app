import { useState } from 'react';
import Svg, { G, Path, Polygon, Rect } from 'react-native-svg';

import Box from '@/components/Box';
import { type AppTheme, useAppTheme } from '@/constants/theme';
import type { Zone } from '@/lib/powerZones';
import { profileBars, roundedTopPath } from '@/lib/profileBars';
import { type WorkoutBlock, profileCeilingPct } from '@/lib/workoutProfile';

/** Default height of the plot area. Tall enough to read a shape, short enough for a tile. */
const DEFAULT_PROFILE_HEIGHT = 48;

/** Hairline between neighbouring blocks, so repeated efforts stay countable. */
const BLOCK_GAP = 2;

/**
 * How visible the cap is against its solid fill. Enough to read the range as
 * part of the same effort, faint enough that the eye still lands on `minPct` —
 * the power the athlete is actually asked to hold.
 */
const CAP_OPACITY = 0.4;

/** Theme colour of each zone, shared with anything else coloured by zone. */
export const ZONE_COLORS: Record<Zone, keyof AppTheme['colors']> = {
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
  /** Height of the plot area in points. Defaults to the tile's 48. */
  height?: number;
}

/**
 * Draws a Workout Profile: one bar per block, in time order, its width its
 * share of the session and its height the power it asks for. A block with a
 * range is drawn solid up to `minPct` and capped to `maxPct`, so the bar states
 * the floor of the effort and hints at its ceiling. A ramp is a solid slope
 * from the power it starts at to the power it ends at, in ridden order.
 *
 * Purely presentational — it knows the block model and the theme, and nothing
 * about intervals.icu, FTP watts, or how the blocks were parsed. It fills the
 * width it's given, and draws once that width is laid out.
 */
export default function WorkoutProfile({
  blocks,
  height = DEFAULT_PROFILE_HEIGHT,
}: WorkoutProfileProps) {
  const { colors, borderRadii } = useAppTheme();
  const [width, setWidth] = useState(0);

  // Nothing to scale against, and nothing to draw: an empty profile, or one
  // whose every block sits on the floor.
  if (profileCeilingPct(blocks) <= 0) return null;

  const bars = profileBars(blocks, { width, height, gap: BLOCK_GAP });

  return (
    <Box
      height={height}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      testID="workout-profile"
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {bars.map((bar, index) => {
            const color = colors[ZONE_COLORS[blocks[index].zone]];
            const right = bar.x + bar.width;
            // Blocks have no identity of their own: they are positions in a
            // time-ordered list that is replaced wholesale, never reordered
            // or spliced, so the index is the stable identity here.
            const key = index;

            // A slope has no flat top to round, so a ramp is drawn square.
            if (bar.ramp) {
              const points = [
                `${bar.x},${height}`,
                `${bar.x},${bar.ramp.startY}`,
                `${right},${bar.ramp.endY}`,
                `${right},${height}`,
              ].join(' ');

              return <Polygon key={key} points={points} fill={color} />;
            }

            const top = (y: number) =>
              roundedTopPath({
                x: bar.x,
                y,
                width: bar.width,
                bottom: height,
                radius: borderRadii.sm,
              });

            if (bar.floorY === bar.capY) {
              return <Path key={key} d={top(bar.floorY)} fill={color} />;
            }

            // The rounded cap runs to the floor beneath the solid fill, which
            // covers its lower part, so only the range above shows faintly.
            return (
              <G key={key}>
                <Path d={top(bar.capY)} fill={color} opacity={CAP_OPACITY} />
                <Rect
                  x={bar.x}
                  y={bar.floorY}
                  width={bar.width}
                  height={height - bar.floorY}
                  fill={color}
                />
              </G>
            );
          })}
        </Svg>
      )}
    </Box>
  );
}
