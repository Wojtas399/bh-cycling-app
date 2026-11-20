import type { ReactNode } from 'react';

import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';

export interface WorkoutDetailsCardProps {
  title?: string;
  children: ReactNode;
}

export default function WorkoutDetailsCard({
  title,
  children,
}: WorkoutDetailsCardProps) {
  return (
    <SheenSurface paddingVertical="base" paddingHorizontal="md">
      {title !== undefined && (
        <Text variant="body-s-medium" color="textSecondary" marginBottom="md">
          {title.toUpperCase()}
        </Text>
      )}
      {children}
    </SheenSurface>
  );
}
