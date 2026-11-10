import type { ReactNode } from 'react';

import Box from '@/components/Box';
import GlassControl from '@/components/GlassControl';
import { useAppTheme } from '@/constants/theme';
import type { SurfacePlacement } from '@/lib/surfaceTreatment';

const HEIGHT = 56;

interface ButtonProps {
  /**
   * `primary` is the screen's main action: near-white glass, so its label
   * uses `textInverse`. `secondary` is clear glass with a light label.
   */
  variant: 'primary' | 'secondary';
  /** `content` inside a card or a list item, `chrome` anywhere else. */
  placement: SurfacePlacement;
  onPress: () => void;
  /** Fades the button and ignores presses, e.g. while its action runs. */
  disabled?: boolean;
  /** The label, an icon and a label, or a spinner, in a centred row. */
  children: ReactNode;
}

/** A full-width glass pill button. */
export default function Button({
  variant,
  placement,
  onPress,
  disabled,
  children,
}: ButtonProps) {
  const { spacing } = useAppTheme();

  return (
    <Box alignSelf="stretch">
      <GlassControl
        placement={placement}
        prominent={variant === 'primary'}
        disabled={disabled}
        onPress={onPress}
        style={{
          height: HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
        }}
      >
        {children}
      </GlassControl>
    </Box>
  );
}
