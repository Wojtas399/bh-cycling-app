import { useEffect, useState } from 'react';

import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import {
  IntervalsAuthError,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { resolveZoneConfig } from '@/lib/powerZones';
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

    Promise.all([
      getCalendarEvents(connection.accessToken, connection.athleteId, {
        oldest: toLocalDateString(now),
        newest: toLocalDateString(tomorrow),
      }),
      // Custom zone boundaries only sharpen the colours of the profile, and
      // Coggan stands in for them well enough. Losing them must never cost the
      // athlete the list of workouts itself.
      getAthleteSettings(connection.accessToken).catch(() => null),
    ])
      .then(([events, settings]) => {
        if (cancelled) return;

        const workouts = getUpcomingWorkouts(
          events,
          now,
          resolveZoneConfig(settings),
        );

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
