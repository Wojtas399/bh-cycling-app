import { View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { ZONE_COLORS } from '@/components/WorkoutProfile';
import { useAppTheme } from '@/constants/theme';
import {
  type ProfileScale,
  type StripSegment,
  axisLabels,
} from '@/lib/detailedProfile';
import { formatDuration } from '@/lib/formatDuration';

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

/**
 * The width each strip's plot gets in a stack `width` wide: what the y-axis
 * labels leave.
 */
export function plotWidthOf(width: number): number {
  return Math.max(0, width - GUTTER);
}

/** One profile of the stack. */
export interface ProfileStripView {
  /** On the stack's time scale, `durationSeconds`. */
  segments: StripSegment[];
  /** What the strip shows, written above it when it shares the stack. */
  caption: string;
}

export interface ProfileWithTimeAxisProps {
  /** Profiles stacked top to bottom on one time scale. */
  strips: ProfileStripView[];
  /** The y-scale every strip shares. */
  scale: ProfileScale;
  /** The time the profiles span, in s. */
  durationSeconds: number;
  /** The stack's laid-out width, in px. */
  width: number;
  /** What a screen reader reads for the whole profile. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * One or more large profiles on one y-scale, with the zone edges as dashed
 * gridlines, and a shared time axis beneath them, each captioned when there's
 * more than one. Static, and read by a screen reader as one image with
 * `accessibilityLabel`; the plots are hidden.
 */
export default function ProfileWithTimeAxis({
  strips,
  scale,
  durationSeconds,
  width,
  accessibilityLabel,
  testID,
}: ProfileWithTimeAxisProps) {
  const height = strips.length > 1 ? STACKED_STRIP_HEIGHT : SINGLE_STRIP_HEIGHT;

  return (
    <Box
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <View importantForAccessibility="no-hide-descendants">
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

/**
 * One strip's plot, `height` tall between its labels: the y labels in the
 * gutter, the dashed gridlines across it, and a bar per segment, solid to its
 * low end and faint to its high end.
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
  const label = (value: number) =>
    scale.unit === 'watts' ? `${Math.round(value)} W` : `${Math.round(value)}%`;

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
      {segments.map(({ start, end, low, high, zone }) => {
        const fullWidth = xOf(end) - xOf(start);
        // A bar too narrow to spare the hairline is drawn whole.
        const inset = fullWidth > 4 * BAR_INSET ? BAR_INSET : 0;
        const x = xOf(start) + inset;
        const barWidth = fullWidth - 2 * inset;
        const color = colors[ZONE_COLORS[zone]];

        return (
          <G key={start}>
            <Rect
              x={x}
              width={barWidth}
              y={yOf(high)}
              height={yOf(low) - yOf(high)}
              fill={color}
              opacity={CAP_OPACITY}
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
