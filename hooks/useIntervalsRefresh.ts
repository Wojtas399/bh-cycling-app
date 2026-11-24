import { useCallback, useState } from 'react';

import { useIntervalsAvailability } from './useIntervalsAvailability';
import { intervalsKeys } from '@/lib/intervalsQueries';
import { refreshIncludes } from '@/lib/screenRefresh';
import { useQueryClient } from '@tanstack/react-query';

export interface IntervalsRefresh {
  refreshing: boolean;
  refresh: () => Promise<void>;
}

export function useIntervalsRefresh(): IntervalsRefresh {
  const { credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const athleteId = credentials?.athleteId;

  const refresh = useCallback(async () => {
    if (athleteId === undefined) return;

    setRefreshing(true);

    try {
      await queryClient.invalidateQueries({
        queryKey: intervalsKeys.athlete(athleteId),
        predicate: refreshIncludes,
      });
    } finally {
      setRefreshing(false);
    }
  }, [athleteId, queryClient]);

  return { refreshing, refresh };
}
