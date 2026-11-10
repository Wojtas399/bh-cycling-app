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

import {
  DISABLED_OPACITY,
  NATIVE_PROMINENT_TINT,
  PRESSED_OVERLAY,
} from '@/constants/surfaces';
import { type AppTheme, useAppTheme } from '@/constants/theme';
import { useSurfaceTreatment } from '@/hooks/useSurfaceTreatment';
import { DarkGlassView } from '@/lib/liquidGlass';
import type { SurfacePlacement } from '@/lib/surfaceTreatment';

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
   * `content` for a control that scrolls with content, which is Frost on
   * every platform; `chrome` for one that stays put in the chrome layer, such
   * as in a sticky header or over the map.
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
  const { borderRadii } = useAppTheme();
  const treatment = useSurfaceTreatment({
    kind: 'control',
    placement,
    prominent,
  });
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
        <DarkGlassView
          isInteractive={pressable}
          tintColor={treatment.prominent ? NATIVE_PROMINENT_TINT : undefined}
          {...viewProps}
          style={[shape, GLASS_EDGE, style]}
        >
          {content}
        </DarkGlassView>
      );
    }

    return (
      <View
        {...viewProps}
        style={[
          shape,
          GLASS_EDGE,
          {
            backgroundColor: treatment.fill,
            borderColor: treatment.hairline,
            borderTopColor: treatment.topEdge,
          },
          style,
        ]}
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
