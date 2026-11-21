import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { RANGE_CAP_OPACITY, ZONE_COLORS } from '@/components/WorkoutProfile';
import { useAppTheme } from '@/constants/theme';
import { NOTHING_CROSSED, crossesToJs } from '@/lib/crossesToJs';
import { type ProfileScale, axisLabels } from '@/lib/detailedProfile';
import { formatDuration } from '@/lib/formatDuration';
import { formatPower } from '@/lib/formatPower';
import { rampPolygonPoints } from '@/lib/profileBars';
import type { PlotStrip } from '@/lib/profilePlot';
import { pointerSeconds } from '@/lib/profileReadout';
import type { StripSegment } from '@/lib/stripSegment';

const LONE_STRIP_PLOT_HEIGHT = 140;

const STACKED_STRIP_PLOT_HEIGHT = 100;

const Y_LABEL_GUTTER = 44;

const END_LABEL_CLEARANCE = 6;

const Y_LABEL_GAP_TO_PLOT = 6;

const LABEL_SIZE = 10;

const BASELINE_LIFT_CENTRING_LABEL = 3.5;

const MIN_Y_LABEL_SPACING_PX = 12;

const HAIRLINE_KEEPING_REPEATS_COUNTABLE = 1;

const TIME_LABEL_DURATION_SHARES = [0, 0.25, 0.5, 0.75, 1];

const POINTER_WIDTH = 1;

export function plotWidthOf(stackWidth: number): number {
  return Math.max(0, stackWidth - Y_LABEL_GUTTER);
}

export interface ProfileWithTimeAxisProps {
  strips: PlotStrip[];
  scale: ProfileScale;
  durationSeconds: number;
  width: number;
  accessibilityLabel: string;
  pointerShown: boolean;
  onScrub: (pointerSeconds: number) => void;
  testID?: string;
}

export default function ProfileWithTimeAxis({
  strips,
  scale,
  durationSeconds,
  width,
  accessibilityLabel,
  pointerShown,
  onScrub,
  testID,
}: ProfileWithTimeAxisProps) {
  const { colors } = useAppTheme();
  const height =
    strips.length > 1 ? STACKED_STRIP_PLOT_HEIGHT : LONE_STRIP_PLOT_HEIGHT;
  const plotWidth = plotWidthOf(width);

  const pointerX = useSharedValue(Y_LABEL_GUTTER);
  const lastCrossedColumn = useSharedValue(NOTHING_CROSSED);

  function scrubToColumn(column: number) {
    onScrub(pointerSeconds(column, plotWidth, durationSeconds));
  }

  function moveTo(x: number) {
    'worklet';
    const column = Math.round(
      Math.min(Math.max(x - Y_LABEL_GUTTER, 0), plotWidth),
    );

    pointerX.set(Y_LABEL_GUTTER + column);

    if (crossesToJs(column, lastCrossedColumn)) {
      scheduleOnRN(scrubToColumn, column);
    }
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart(event => {
      lastCrossedColumn.set(NOTHING_CROSSED);
      moveTo(event.x);
    })
    .onUpdate(event => {
      moveTo(event.x);
    });

  const pointerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pointerX.get() - POINTER_WIDTH / 2 }],
  }));

  return (
    <Box
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <View importantForAccessibility="no-hide-descendants">
        <GestureDetector gesture={pan}>
          <View>
            <Strips
              strips={strips}
              scale={scale}
              durationSeconds={durationSeconds}
              width={width}
              height={height}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: POINTER_WIDTH,
                  backgroundColor: colors.textPrimary,
                  opacity: pointerShown ? 1 : 0,
                },
                pointerStyle,
              ]}
            />
          </View>
        </GestureDetector>
        <Box
          flexDirection="row"
          justifyContent="space-between"
          style={{ marginLeft: Y_LABEL_GUTTER }}
        >
          {TIME_LABEL_DURATION_SHARES.map(share => (
            <Text key={share} variant="body-xs-regular" color="textTertiary">
              {formatDuration(durationSeconds * share)}
            </Text>
          ))}
        </Box>
      </View>
    </Box>
  );
}

function Strips({
  strips,
  scale,
  durationSeconds,
  width,
  height,
}: {
  strips: PlotStrip[];
  scale: ProfileScale;
  durationSeconds: number;
  width: number;
  height: number;
}) {
  const captionsTellStripsApart = strips.length > 1;

  return (
    <Box gap="md">
      {strips.map(({ segments, caption }) => (
        <Box key={caption} gap="xs">
          {captionsTellStripsApart && (
            <Text
              variant="body-xs-medium"
              color="textSecondary"
              style={{ marginLeft: Y_LABEL_GUTTER }}
            >
              {caption}
            </Text>
          )}
          <StripPlot
            segments={segments}
            scale={scale}
            durationSeconds={durationSeconds}
            width={width}
            height={height}
          />
        </Box>
      ))}
    </Box>
  );
}

function StripPlot({
  segments,
  scale,
  durationSeconds,
  width,
  height,
}: {
  segments: StripSegment[];
  scale: ProfileScale;
  durationSeconds: number;
  width: number;
  height: number;
}) {
  const { colors } = useAppTheme();
  const plotWidth = plotWidthOf(width);
  const xOf = (seconds: number) =>
    Y_LABEL_GUTTER + (seconds / durationSeconds) * plotWidth;
  const yOf = (value: number) =>
    END_LABEL_CLEARANCE + (1 - value / scale.ceiling) * height;
  const label = (value: number) => formatPower(scale.unit, value);

  return (
    <Svg width={width} height={height + 2 * END_LABEL_CLEARANCE}>
      {scale.gridlines.map(value => (
        <Line
          key={value}
          x1={Y_LABEL_GUTTER}
          x2={width}
          y1={yOf(value)}
          y2={yOf(value)}
          stroke={colors.hairlineStrong}
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
      ))}
      <Line
        x1={Y_LABEL_GUTTER}
        x2={width}
        y1={yOf(0)}
        y2={yOf(0)}
        stroke={colors.hairline}
      />
      {axisLabels(scale, height, MIN_Y_LABEL_SPACING_PX).map(value => (
        <SvgText
          key={value}
          x={Y_LABEL_GUTTER - Y_LABEL_GAP_TO_PLOT}
          y={yOf(value) + BASELINE_LIFT_CENTRING_LABEL}
          fill={colors.textTertiary}
          fontSize={LABEL_SIZE}
          textAnchor="end"
        >
          {label(value)}
        </SvgText>
      ))}
      {segments.map(({ start, end, low, high, zone, ramp }) => {
        const fullWidth = xOf(end) - xOf(start);
        const sparesHairline =
          fullWidth > 4 * HAIRLINE_KEEPING_REPEATS_COUNTABLE;
        const inset = sparesHairline ? HAIRLINE_KEEPING_REPEATS_COUNTABLE : 0;
        const x = xOf(start) + inset;
        const barWidth = fullWidth - 2 * inset;
        const color = colors[ZONE_COLORS[zone]];

        if (ramp) {
          const points = rampPolygonPoints({
            x,
            width: barWidth,
            bottom: yOf(0),
            startY: yOf(ramp.startOnScale),
            endY: yOf(ramp.endOnScale),
          });

          return <Polygon key={start} points={points} fill={color} />;
        }

        return (
          <G key={start}>
            <Rect
              x={x}
              width={barWidth}
              y={yOf(high)}
              height={yOf(low) - yOf(high)}
              fill={color}
              opacity={RANGE_CAP_OPACITY}
            />
            <Rect
              x={x}
              width={barWidth}
              y={yOf(low)}
              height={yOf(0) - yOf(low)}
              fill={color}
            />
          </G>
        );
      })}
    </Svg>
  );
}
