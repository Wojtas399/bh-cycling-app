import type { ComponentProps } from 'react';

import Box from '@/components/Box';
import { useAppTheme } from '@/constants/theme';
import { useSurfaceTreatment } from '@/hooks/useSurfaceTreatment';

type SheenSurfaceProps = Omit<
  ComponentProps<typeof Box>,
  'backgroundColor' | 'bg' | 'borderRadius'
>;

export default function SheenSurface({ style, ...props }: SheenSurfaceProps) {
  const { colors } = useAppTheme();
  const { paint, hairlineStrong } = useSurfaceTreatment({ kind: 'sheen' });

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
