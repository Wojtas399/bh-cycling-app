import { useState } from 'react';
import Svg, { G, Path, Polygon, Rect } from 'react-native-svg';

import Box from '@/components/Box';
import { type AppTheme, useAppTheme } from '@/constants/theme';
import type { Zone } from '@/lib/powerZones';
import {
  type ProfileBar,
  profileBars,
  rampPolygonPoints,
  roundedTopPath,
} from '@/lib/profileBars';
import type { WorkoutBlock } from '@/lib/workoutProfile';

const TILE_PROFILE_HEIGHT = 48;

const BLOCK_GAP_KEEPING_REPEATS_COUNTABLE = 2;

export const RANGE_CAP_OPACITY = 0.4;

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
  blocks: WorkoutBlock[];
  height?: number;
}

export default function WorkoutProfile({
  blocks,
  height = TILE_PROFILE_HEIGHT,
}: WorkoutProfileProps) {
  const { colors, borderRadii } = useAppTheme();
  const [width, setWidth] = useState(0);

  const bars = profileBars(blocks, {
    width,
    height,
    gap: BLOCK_GAP_KEEPING_REPEATS_COUNTABLE,
  });

  if (bars.length === 0) return null;

  return (
    <Box
      height={height}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      testID="workout-profile"
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {bars.map((bar, index) => (
            // eslint-disable-next-line react/no-array-index-key -- blocks have no identity of their own: they are positions in a time-ordered list that is replaced wholesale, never reordered or spliced, so the index is the stable identity
            <G key={index}>
              <BarShape
                bar={bar}
                bottom={height}
                color={colors[ZONE_COLORS[bar.zone]]}
                radius={borderRadii.sm}
              />
            </G>
          ))}
        </Svg>
      )}
    </Box>
  );
}

function BarShape({
  bar,
  bottom,
  color,
  radius,
}: {
  bar: ProfileBar;
  bottom: number;
  color: string;
  radius: number;
}) {
  if (bar.shape === 'ramp' && bar.ramp) {
    const points = rampPolygonPoints({
      x: bar.x,
      width: bar.width,
      bottom,
      startY: bar.ramp.startY,
      endY: bar.ramp.endY,
    });

    return <Polygon points={points} fill={color} />;
  }

  const top = (y: number) =>
    roundedTopPath({ x: bar.x, y, width: bar.width, bottom, radius });

  if (bar.shape === 'flat') {
    return <Path d={top(bar.floorY)} fill={color} />;
  }

  const capDownToFloorUnderSolidFill = top(bar.capY);

  return (
    <>
      <Path
        d={capDownToFloorUnderSolidFill}
        fill={color}
        opacity={RANGE_CAP_OPACITY}
      />
      <Rect
        x={bar.x}
        y={bar.floorY}
        width={bar.width}
        height={bottom - bar.floorY}
        fill={color}
      />
    </>
  );
}
