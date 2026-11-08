import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import RaceRankIcon from '@/components/race/RaceRankIcon';
import type { RacePriority } from '@/lib/races';

/**
 * A Race Priority as the tiles draw it: its rank icon, then "Wyścig X" — a
 * red "WYŚCIG A" eyebrow for an A Race, muted for the others.
 */
export default function RacePriorityLabel({
  priority,
}: {
  priority: RacePriority;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'race' });
  const label = t('priority', { priority });

  return (
    <Box flexDirection="row" alignItems="center">
      <Box marginRight="xs">
        <RaceRankIcon priority={priority} size={14} />
      </Box>
      {priority === 'A' ? (
        <Text
          variant="body-xs-medium"
          color="race"
          style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
        >
          {label}
        </Text>
      ) : (
        <Text variant="body-s-regular" color="textSecondary">
          {label}
        </Text>
      )}
    </Box>
  );
}
