import type { ReactNode } from 'react';

import Box from '@/components/Box';
import Text from '@/components/Text';

export interface WorkoutDetailsCardProps {
  /** Section heading, shown upper-cased above the content. */
  title?: string;
  children: ReactNode;
}

/**
 * One stacked card of the Workout Details screen (Variant A). Its 12px
 * horizontal padding plus the screen's 8px puts content 20px from the edges.
 */
export default function WorkoutDetailsCard({
  title,
  children,
}: WorkoutDetailsCardProps) {
  return (
    <Box
      backgroundColor="bgSecondary"
      borderRadius="lg"
      paddingVertical="base"
      paddingHorizontal="md"
    >
      {title !== undefined && (
        <Text variant="body-s-medium" color="textSecondary" marginBottom="md">
          {title.toUpperCase()}
        </Text>
      )}
      {children}
    </Box>
  );
}
