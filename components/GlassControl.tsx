import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { type AppTheme, useAppTheme } from '@/constants/theme';
import { useSurfaceContrast } from '@/hooks/useSurfaceContrast';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import {
  type ControlTreatment,
  type SurfacePlacement,
  resolveSurfaceTreatment,
} from '@/lib/surfaceTreatment';
import { GlassView } from 'expo-glass-effect';

const NATIVE_PROMINENT_TINT = 'rgba(255, 255, 255, 0.92)';

const FROST_PLAIN = {
  fill: 'rgba(255, 255, 255, 0.08)',
  hairline: 'rgba(255, 255, 255, 0.10)',
  topEdge: 'rgba(255, 255, 255, 0.30)',
};
/** Plain Frost under Increase Contrast; its hairline is `hairlineStrong`. */
const FROST_PLAIN_STRONG_FILL = 'rgba(255, 255, 255, 0.14)';
const FROST_PROMINENT = {
  fill: 'rgba(236, 236, 240, 0.92)',
  hairline: 'rgba(255, 255, 255, 0.5)',
  topEdge: '#FFFFFF',
};

const PRESSED_OVERLAY = 'rgba(255, 255, 255, 0.12)';
const DISABLED_OPACITY = 0.4;

/**
 * Every paint keeps a 1px edge (transparent on native glass), so a control
 * measures the same on every platform. A bare segment next to a glass one
 * takes the same transparent edge to line up with it.
 */
export const GLASS_EDGE: ViewStyle = {
  borderWidth: 1,
  borderColor: 'transparent',
};

type GlassControlProps = Omit<
  PressableProps,
  'style' | 'children' | 'disabled'
> & {
  /**
   * `chrome` for a control outside cards and lists, such as in a sticky
   * header or over the map; `content` for one inside a card or a list item,
   * which is Frost on every platform.
   */
  placement: SurfacePlacement;
  /** The main action or the selected segment: near-white, for `textInverse`. */
  prominent?: boolean;
  /** Fades the control to 40% and ignores presses. */
  disabled?: boolean;
  borderRadius?: keyof AppTheme['borderRadii'];
  /**
   * Shapes the surface: its size, padding and content layout. A pressable
   * control sits inside a plain `Pressable`, so position it from outside.
   */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * The surface under every glassy control: native Liquid Glass in the chrome
 * on iOS 26, Frost elsewhere, solid under Reduce Transparency. With `onPress`
 * it is a button that brightens while pressed; without, a glass shell that
 * takes view props, such as a segmented track or a stat chip.
 */
export default function GlassControl({
  placement,
  prominent = false,
  disabled = false,
  borderRadius = 'full',
  style,
  children,
  ...props
}: GlassControlProps) {
  const { colors, borderRadii } = useAppTheme();
  const treatment = resolveSurfaceTreatment(
    { kind: 'control', placement, prominent },
    { liquidGlassAvailable, ...useSurfaceContrast() },
  );
  const pressable = props.onPress !== undefined;

  function surface(pressed: boolean, viewProps?: ViewProps) {
    const shape: ViewStyle = {
      borderRadius: borderRadii[borderRadius],
      overflow: 'hidden',
      opacity: disabled ? DISABLED_OPACITY : 1,
    };
    const content = (
      <>
        {children}
        {pressed && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: PRESSED_OVERLAY },
            ]}
          />
        )}
      </>
    );

    if (treatment.paint === 'native') {
      return (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive={pressable}
          tintColor={treatment.prominent ? NATIVE_PROMINENT_TINT : undefined}
          {...viewProps}
          style={[shape, GLASS_EDGE, style]}
        >
          {content}
        </GlassView>
      );
    }

    return (
      <View
        {...viewProps}
        style={[shape, fallbackStyle(treatment, colors), style]}
      >
        {content}
      </View>
    );
  }

  if (!pressable) return surface(false, props);

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      accessibilityState={{ ...props.accessibilityState, disabled }}
    >
      {({ pressed }) => surface(pressed)}
    </Pressable>
  );
}

function fallbackStyle(
  treatment: Exclude<ControlTreatment, { paint: 'native' }>,
  colors: AppTheme['colors'],
): ViewStyle {
  if (treatment.paint === 'opaque') {
    return {
      ...GLASS_EDGE,
      backgroundColor: colors[treatment.fill],
      borderColor: treatment.hairlineStrong
        ? colors.hairlineStrong
        : colors.hairline,
    };
  }

  if (treatment.prominent) {
    return {
      ...GLASS_EDGE,
      backgroundColor: FROST_PROMINENT.fill,
      borderColor: FROST_PROMINENT.hairline,
      borderTopColor: FROST_PROMINENT.topEdge,
    };
  }

  return {
    ...GLASS_EDGE,
    backgroundColor: treatment.hairlineStrong
      ? FROST_PLAIN_STRONG_FILL
      : FROST_PLAIN.fill,
    borderColor: treatment.hairlineStrong
      ? colors.hairlineStrong
      : FROST_PLAIN.hairline,
    borderTopColor: FROST_PLAIN.topEdge,
  };
}
