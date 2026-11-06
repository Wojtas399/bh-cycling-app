import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { type AppTheme, useAppTheme } from '@/constants/theme';
import type { FitnessDay, FitnessRange } from '@/lib/fitness';
import {
  type FitnessChartGeometry,
  type FitnessChartSeries,
  type FitnessChartTick,
  fitnessChartGeometry,
  fitnessDayIndexAt,
  fitnessSlotCentre,
} from '@/lib/fitnessChart';

interface Size {
  width: number;
  height: number;
}

/** Each line's colour and stroke width; today's dot takes the colour. */
const SERIES: Record<
  FitnessChartSeries,
  { color: keyof AppTheme['colors']; width: number }
> = {
  fitness: { color: 'chartFitness', width: 2 },
  fatigue: { color: 'chartFatigue', width: 1.5 },
  form: { color: 'chartForm', width: 1.75 },
};

const DOT_RADIUS = 3.5;
const LABEL_SIZE = 10;
/** Lifts a label's baseline so the label sits centred on its tick. */
const LABEL_BASELINE = 4;
/** The y labels' gap from the plot's right edge. */
const LABEL_GAP = 6;
const CURSOR_WIDTH = 1;

/**
 * The two-panel chart of a range's `days`, filling the space it's given:
 * Fitness and Fatigue over the load bars on top, Form around zero below. A
 * sideways drag moves a cursor through both panels, snapped to whole days,
 * and reports the touched day's index to `onTouchDay`, then `null` on
 * release. A vertical swipe is left to the screen's scroll.
 */
export default function FitnessChart({
  days,
  range,
  onTouchDay,
}: {
  days: FitnessDay[];
  range: FitnessRange;
  onTouchDay: (index: number | null) => void;
}) {
  const [size, setSize] = useState<Size | null>(null);

  return (
    <View
      style={{ flex: 1 }}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize(current =>
          current?.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height },
        )
      }
    >
      {size && size.width > 0 && size.height > 0 && (
        <MeasuredFitnessChart
          days={days}
          range={range}
          size={size}
          onTouchDay={onTouchDay}
        />
      )}
    </View>
  );
}

/**
 * The chart once its size is known. The SVG is static, drawn again only when
 * the days, range or size change; the cursor moves on the UI thread, and the
 * touched index crosses to JS only when it changes.
 */
function MeasuredFitnessChart({
  days,
  range,
  size,
  onTouchDay,
}: {
  days: FitnessDay[];
  range: FitnessRange;
  size: Size;
  onTouchDay: (index: number | null) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const geometry = fitnessChartGeometry(days, range, size, {
    monthsShort: t('note.monthsShort', { returnObjects: true }),
  });
  const { slotWidth } = geometry;
  const dayCount = days.length;

  const cursorX = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  // -1 while nothing is touched.
  const touched = useSharedValue(-1);

  function moveCursor(x: number) {
    'worklet';
    const index = fitnessDayIndexAt(x, slotWidth, dayCount);

    cursorX.set(fitnessSlotCentre(index, slotWidth) - CURSOR_WIDTH / 2);

    if (index !== touched.get()) {
      touched.set(index);
      scheduleOnRN(onTouchDay, index);
    }
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-10, 10])
    .onStart(event => {
      cursorOpacity.set(1);
      moveCursor(event.x);
    })
    .onUpdate(event => {
      moveCursor(event.x);
    })
    .onFinalize(() => {
      cursorOpacity.set(0);

      if (touched.get() !== -1) {
        touched.set(-1);
        scheduleOnRN(onTouchDay, null);
      }
    });

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.get(),
    transform: [{ translateX: cursorX.get() }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }}>
        <FitnessChartPlot geometry={geometry} size={size} />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: CURSOR_WIDTH,
              height: geometry.plotHeight,
              backgroundColor: colors.gray400,
            },
            cursorStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

/** The chart's static drawing: grid, bars, lines, dots and labels. */
function FitnessChartPlot({
  geometry: { plotWidth, top, bottom, dots, xTicks },
  size,
}: {
  geometry: FitnessChartGeometry;
  size: Size;
}) {
  const { colors } = useAppTheme();

  return (
    <Svg width={size.width} height={size.height}>
      <Grid ticks={[...top.ticks, ...bottom.ticks]} width={plotWidth} />
      <Line
        x1={0}
        x2={plotWidth}
        y1={bottom.zeroY}
        y2={bottom.zeroY}
        stroke={colors.gray600}
        strokeWidth={1}
      />
      <Path d={top.bars} fill={colors.chartLoad} />
      <SeriesLine d={top.fatigue} series="fatigue" />
      <SeriesLine d={top.fitness} series="fitness" />
      <SeriesLine d={bottom.form} series="form" />
      {dots.map(({ series, x, y }) => (
        <Circle
          key={series}
          cx={x}
          cy={y}
          r={DOT_RADIUS}
          fill={colors[SERIES[series].color]}
        />
      ))}
      {[...top.ticks, ...bottom.ticks].map(({ y, label }) => (
        <ChartLabel
          key={`${y}`}
          x={plotWidth + LABEL_GAP}
          y={y + LABEL_BASELINE}
          anchor="start"
        >
          {label}
        </ChartLabel>
      ))}
      {xTicks.map(({ x, label }) => (
        <ChartLabel
          key={`${x}`}
          x={x}
          y={size.height - LABEL_BASELINE}
          anchor="middle"
        >
          {label}
        </ChartLabel>
      ))}
    </Svg>
  );
}

/** A horizontal grid line across the plot at each tick. */
function Grid({ ticks, width }: { ticks: FitnessChartTick[]; width: number }) {
  const { colors } = useAppTheme();

  return ticks.map(({ y }) => (
    <Line
      key={`${y}`}
      x1={0}
      x2={width}
      y1={y}
      y2={y}
      stroke={colors.borderDefault}
      strokeWidth={1}
    />
  ));
}

function SeriesLine({ d, series }: { d: string; series: FitnessChartSeries }) {
  const { colors } = useAppTheme();
  const { color, width } = SERIES[series];

  return <Path d={d} stroke={colors[color]} strokeWidth={width} fill="none" />;
}

function ChartLabel({
  x,
  y,
  anchor,
  children,
}: {
  x: number;
  y: number;
  anchor: 'start' | 'middle';
  children: string;
}) {
  const { colors } = useAppTheme();

  return (
    <SvgText
      x={x}
      y={y}
      fill={colors.textTertiary}
      fontSize={LABEL_SIZE}
      textAnchor={anchor}
    >
      {children}
    </SvgText>
  );
}
