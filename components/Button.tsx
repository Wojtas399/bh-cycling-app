import type { ReactNode } from 'react';

import Box from '@/components/Box';
import GlassControl from '@/components/GlassControl';
import { useAppTheme } from '@/constants/theme';
import type { SurfacePlacement } from '@/lib/surfaceTreatment';

const HEIGHT = 56;

interface ButtonProps {
  variant: 'primary' | 'secondary';
  placement: SurfacePlacement;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}

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
        surfaceStyle={{
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
