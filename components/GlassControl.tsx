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

export const EDGE_MEASURING_ALIKE_ON_EVERY_PAINT: ViewStyle = {
  borderWidth: 1,
  borderColor: 'transparent',
};

type GlassControlProps = Omit<
  PressableProps,
  'style' | 'children' | 'disabled'
> & {
  placement: SurfacePlacement;
  prominent?: boolean;
  disabled?: boolean;
  borderRadius?: keyof AppTheme['borderRadii'];
  surfaceStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export default function GlassControl({
  placement,
  prominent = false,
  disabled = false,
  borderRadius = 'full',
  surfaceStyle,
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
          style={[shape, EDGE_MEASURING_ALIKE_ON_EVERY_PAINT, surfaceStyle]}
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
          EDGE_MEASURING_ALIKE_ON_EVERY_PAINT,
          {
            backgroundColor: treatment.fill,
            borderColor: treatment.hairline,
            borderTopColor: treatment.topEdge,
          },
          surfaceStyle,
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
