import { useEffect, useState } from 'react';

import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import { IntervalsAuthError, getCalendarEvents } from '@/lib/intervalsApi';
import {
  type UpcomingWorkout,
  getUpcomingWorkouts,
  toLocalDateString,
} from '@/lib/upcomingWorkouts';

export type UpcomingWorkoutsState =
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; workouts: UpcomingWorkout[] };

const HIDDEN: UpcomingWorkoutsState = { status: 'hidden' };
const LOADING: UpcomingWorkoutsState = { status: 'loading' };

export function useUpcomingWorkouts(): UpcomingWorkoutsState {
  const connection = useIntervalsConnection();
  const [state, setState] = useState<UpcomingWorkoutsState>(LOADING);

  useEffect(() => {
    if (connection.loading) {
      setState(LOADING);

      return;
    }

    if (
      !connection.isConnected ||
      !connection.accessToken ||
      !connection.athleteId
    ) {
      setState(HIDDEN);

      return;
    }

    let cancelled = false;

    setState(LOADING);

    const now = new Date();
    const tomorrow = new Date(now);

    tomorrow.setDate(tomorrow.getDate() + 1);

    getCalendarEvents(connection.accessToken, connection.athleteId, {
      oldest: toLocalDateString(now),
      newest: toLocalDateString(tomorrow),
    })
      .then(events => {
        if (cancelled) return;

        const workouts = getUpcomingWorkouts(events, now);

        setState(
          workouts.length === 0
            ? { status: 'empty' }
            : { status: 'ready', workouts },
        );
      })
      .catch(async (error: unknown) => {
        if (error instanceof IntervalsAuthError) {
          await handleIntervalsAuthError(error);
        }

        if (cancelled) return;

        setState(HIDDEN);
      });

    return () => {
      cancelled = true;
    };
  }, [
    connection.loading,
    connection.isConnected,
    connection.accessToken,
    connection.athleteId,
  ]);

  return state;
}
