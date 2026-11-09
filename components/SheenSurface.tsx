import type { ComponentProps } from 'react';

import Box from '@/components/Box';
import { useAppTheme } from '@/constants/theme';
import { useSurfaceContrast } from '@/hooks/useSurfaceContrast';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import { resolveSurfaceTreatment } from '@/lib/surfaceTreatment';

type SheenSurfaceProps = Omit<
  ComponentProps<typeof Box>,
  'backgroundColor' | 'bg' | 'borderRadius'
>;

/**
 * A content card: a monochrome gradient from the top-left that melts into the
 * page at the bottom-right, with a hairline edge. Under Increase Contrast it
 * turns flat with a stronger edge. Takes Box layout props; the radius is
 * fixed. A data colour may replace the hairline (`borderColor`), as on an A
 * Race. Never nest one Sheen inside another.
 */
export default function SheenSurface({ style, ...props }: SheenSurfaceProps) {
  const { colors } = useAppTheme();
  const { paint, hairlineStrong } = resolveSurfaceTreatment(
    { kind: 'sheen' },
    { liquidGlassAvailable, ...useSurfaceContrast() },
  );

  return (
    <Box
      borderWidth={1}
      borderColor={hairlineStrong ? 'hairlineStrong' : 'hairline'}
      {...props}
      borderRadius="xl"
      backgroundColor={paint === 'flat' ? 'sheenFrom' : undefined}
      style={[
        paint === 'gradient' && {
          experimental_backgroundImage: `linear-gradient(160deg, ${colors.sheenFrom}, ${colors.sheenTo})`,
        },
        style,
      ]}
    />
  );
}
