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
import { ZONE_COLORS } from '@/components/WorkoutProfile';
import { useAppTheme } from '@/constants/theme';
import { type ProfileScale, axisLabels } from '@/lib/detailedProfile';
import { formatDuration } from '@/lib/formatDuration';
import { formatPower } from '@/lib/formatPower';
import { rampPolygonPoints } from '@/lib/profileBars';
import type { PlotStrip } from '@/lib/profilePlot';
import { pointerSeconds } from '@/lib/profileReadout';
import type { StripSegment } from '@/lib/stripSegment';

/** The plot's height when a strip has the card to itself. */
const SINGLE_STRIP_HEIGHT = 140;

/** Each strip's plot height when two share the card. */
const STACKED_STRIP_HEIGHT = 100;

/** Room left of the plot for the y-axis labels. */
const GUTTER = 44;

/** Room above and below the plot, so the end labels aren't clipped. */
const LABEL_PAD = 6;

/** The y labels' gap from the plot's left edge. */
const LABEL_GAP = 6;

const LABEL_SIZE = 10;

/** Lifts a label's baseline so the label sits centred on its line. */
const LABEL_BASELINE = 3.5;

/** Closest two y labels may sit, in px. */
const MIN_LABEL_SPACING = 12;

/** Hairline between neighbouring bars, so repeated efforts stay countable. */
const BAR_INSET = 1;

/** See `WorkoutProfile`: a range shows faintly above its solid floor. */
const CAP_OPACITY = 0.4;

/** Where the time-axis labels sit, as shares of the profile's duration. */
const AXIS_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

const POINTER_WIDTH = 1;

/**
 * The width each strip's plot gets in a stack `width` wide: what the y-axis
 * labels leave.
 */
export function plotWidthOf(width: number): number {
  return Math.max(0, width - GUTTER);
}

export interface ProfileWithTimeAxisProps {
  /** Profiles stacked top to bottom on one time scale. */
  strips: PlotStrip[];
  /** The y-scale every strip shares. */
  scale: ProfileScale;
  /** The time the profiles span, in s. */
  durationSeconds: number;
  /** The stack's laid-out width, in px. */
  width: number;
  /** What a screen reader reads for the whole profile. */
  accessibilityLabel: string;
  /** Whether the scrub pointer shows: from the first scrub until it's hidden. */
  pointerShown: boolean;
  /** The pointer moved to `seconds` on the time scale. */
  onScrub: (seconds: number) => void;
  testID?: string;
}

/**
 * One or more large profiles on one y-scale, with the zone edges as dashed
 * gridlines, and a shared time axis beneath them, each captioned when there's
 * more than one. A sideways drag moves one pointer through every strip and
 * reports its time to `onScrub`; the pointer stays where the finger lifts. A
 * vertical swipe is left to the screen's scroll. Read by a screen reader as
 * one image with `accessibilityLabel`; the plots and the scrub are hidden.
 */
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
  const height = strips.length > 1 ? STACKED_STRIP_HEIGHT : SINGLE_STRIP_HEIGHT;
  const plotWidth = plotWidthOf(width);

  // The pointer moves on the UI thread, and its whole-px column crosses to JS
  // only when it changes. -1 until the drag's first move.
  const pointerX = useSharedValue(GUTTER);
  const column = useSharedValue(-1);

  function scrubToColumn(px: number) {
    onScrub(pointerSeconds(px, plotWidth, durationSeconds));
  }

  function moveTo(x: number) {
    'worklet';
    const px = Math.round(Math.min(Math.max(x - GUTTER, 0), plotWidth));

    pointerX.set(GUTTER + px);

    if (px !== column.get()) {
      column.set(px);
      scheduleOnRN(scrubToColumn, px);
    }
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart(event => {
      // The pointer may have been hidden since the last drag, so report it
      // even at the same column.
      column.set(-1);
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
          style={{ marginLeft: GUTTER }}
        >
          {AXIS_FRACTIONS.map(fraction => (
            <Text key={fraction} variant="body-xs-regular" color="textTertiary">
              {formatDuration(durationSeconds * fraction)}
            </Text>
          ))}
        </Box>
      </View>
    </Box>
  );
}

/** The plots stacked, each captioned when there's more than one. */
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
  return (
    <Box gap="md">
      {strips.map(({ segments, caption }) => (
        <Box key={caption} gap="xs">
          {/* A lone profile needs no caption: the card says what it is. */}
          {strips.length > 1 && (
            <Text
              variant="body-xs-medium"
              color="textSecondary"
              style={{ marginLeft: GUTTER }}
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

/**
 * One strip's plot, `height` tall between its labels: the y labels in the
 * gutter, the dashed gridlines across it, and a bar per segment, solid to its
 * low end and faint to its high end, or a solid slope for a ramp.
 */
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
    GUTTER + (seconds / durationSeconds) * plotWidth;
  const yOf = (value: number) =>
    LABEL_PAD + (1 - value / scale.ceiling) * height;
  const label = (value: number) => formatPower(scale.unit, value);

  return (
    <Svg width={width} height={height + 2 * LABEL_PAD}>
      {scale.gridlines.map(value => (
        <Line
          key={value}
          x1={GUTTER}
          x2={width}
          y1={yOf(value)}
          y2={yOf(value)}
          stroke={colors.hairlineStrong}
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
      ))}
      <Line
        x1={GUTTER}
        x2={width}
        y1={yOf(0)}
        y2={yOf(0)}
        stroke={colors.hairline}
      />
      {axisLabels(scale, height, MIN_LABEL_SPACING).map(value => (
        <SvgText
          key={value}
          x={GUTTER - LABEL_GAP}
          y={yOf(value) + LABEL_BASELINE}
          fill={colors.textTertiary}
          fontSize={LABEL_SIZE}
          textAnchor="end"
        >
          {label(value)}
        </SvgText>
      ))}
      {segments.map(segment => {
        const {
          startSeconds,
          endSeconds,
          lowOnScale,
          highOnScale,
          zone,
          ramp,
        } = segment;
        const fullWidth = xOf(endSeconds) - xOf(startSeconds);
        // A bar too narrow to spare the hairline is drawn whole.
        const inset = fullWidth > 4 * BAR_INSET ? BAR_INSET : 0;
        const x = xOf(startSeconds) + inset;
        const barWidth = fullWidth - 2 * inset;
        const color = colors[ZONE_COLORS[zone]];

        // A ramp is a solid slope from its start power to its end power, in
        // the order it's ridden, with no faint cap.
        if (ramp) {
          const points = rampPolygonPoints({
            x,
            width: barWidth,
            bottom: yOf(0),
            startY: yOf(ramp.startOnScale),
            endY: yOf(ramp.endOnScale),
          });

          return <Polygon key={startSeconds} points={points} fill={color} />;
        }

        return (
          <G key={startSeconds}>
            <Rect
              x={x}
              width={barWidth}
              y={yOf(highOnScale)}
              height={yOf(lowOnScale) - yOf(highOnScale)}
              fill={color}
              opacity={CAP_OPACITY}
            />
            <Rect
              x={x}
              width={barWidth}
              y={yOf(lowOnScale)}
              height={yOf(0) - yOf(lowOnScale)}
              fill={color}
            />
          </G>
        );
      })}
    </Svg>
  );
}
