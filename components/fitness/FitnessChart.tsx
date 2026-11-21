import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { FITNESS_SERIES_COLORS } from '@/components/fitness/fitnessSeriesColors';
import { useAppTheme } from '@/constants/theme';
import { useFitnessLabels } from '@/hooks/fitness/useFitnessLabels';
import { NOTHING_CROSSED, crossesToJs } from '@/lib/crossesToJs';
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

const SERIES_STROKE_WIDTHS: Record<FitnessChartSeries, number> = {
  fitness: 2,
  fatigue: 1.5,
  form: 1.75,
};

const DOT_RADIUS = 3.5;
const LABEL_SIZE = 10;
const BASELINE_LIFT_CENTRING_LABEL = 4;
const Y_LABEL_GAP_TO_PLOT = 6;
const CURSOR_WIDTH = 1;

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
  const { colors } = useAppTheme();
  const labels = useFitnessLabels();
  const geometry = useMemo(
    () => fitnessChartGeometry(days, range, size, labels),
    [days, range, size, labels],
  );
  const { slotWidth } = geometry;
  const dayCount = days.length;

  const cursorX = useSharedValue(0);
  const cursorOpacity = useSharedValue(0);
  const touched = useSharedValue(NOTHING_CROSSED);

  function moveCursor(x: number) {
    'worklet';
    const index = fitnessDayIndexAt(x, slotWidth, dayCount);

    cursorX.set(fitnessSlotCentre(index, slotWidth) - CURSOR_WIDTH / 2);

    if (crossesToJs(index, touched)) {
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

      if (touched.get() !== NOTHING_CROSSED) {
        touched.set(NOTHING_CROSSED);
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
          fill={colors[FITNESS_SERIES_COLORS[series]]}
        />
      ))}
      {[...top.ticks, ...bottom.ticks].map(({ y, label }) => (
        <ChartLabel
          key={`${y}`}
          x={plotWidth + Y_LABEL_GAP_TO_PLOT}
          y={y + BASELINE_LIFT_CENTRING_LABEL}
          anchor="start"
        >
          {label}
        </ChartLabel>
      ))}
      {xTicks.map(({ x, label }) => (
        <ChartLabel
          key={`${x}`}
          x={x}
          y={size.height - BASELINE_LIFT_CENTRING_LABEL}
          anchor="middle"
        >
          {label}
        </ChartLabel>
      ))}
    </Svg>
  );
}

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

  return (
    <Path
      d={d}
      stroke={colors[FITNESS_SERIES_COLORS[series]]}
      strokeWidth={SERIES_STROKE_WIDTHS[series]}
      fill="none"
    />
  );
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
