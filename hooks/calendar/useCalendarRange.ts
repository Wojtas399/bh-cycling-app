import { useCallback, useEffect, useRef, useState } from 'react';

import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { type FetchOptions, getWorkoutsByDate } from '@/lib/calendarWorkouts';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import { IntervalsAuthError } from '@/lib/intervalsApi';
import { queryClient } from '@/lib/queryClient';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export type CalendarViewState =
  | { status: 'hidden' }
  | { status: 'loading' }
  /** The range couldn't be fetched (network/server failure), not a disconnect. */
  | { status: 'error' }
  | {
      status: 'ready';
      workoutsByDate: Record<string, CalendarWorkout[]>;
      refreshing: boolean;
    };

export interface UseCalendarRangeResult {
  state: CalendarViewState;
  anchor: Date;
  goToPrevious: () => void;
  goToNext: () => void;
  refresh: () => void;
}

/**
 * Configures `useCalendarRange` for a specific range shape (month, week, ...).
 * `step` receives `-1`/`1` and is expected to move `anchor` by one unit of
 * that range in the given direction.
 */
export interface UseCalendarRangeConfig {
  initialAnchor: () => Date;
  startOf: (anchor: Date) => Date;
  endOf: (anchor: Date) => Date;
  fetchRange: (
    token: string,
    athleteId: string,
    anchor: Date,
    now: Date,
    options?: FetchOptions,
  ) => Promise<void>;
  isRangeFetched: (anchor: Date, athleteId: string) => boolean;
  step: (anchor: Date, direction: -1 | 1) => Date;
}

const HIDDEN: CalendarViewState = { status: 'hidden' };
const LOADING: CalendarViewState = { status: 'loading' };
const ERROR: CalendarViewState = { status: 'error' };

export function useCalendarRange({
  initialAnchor,
  startOf,
  endOf,
  fetchRange,
  isRangeFetched,
  step,
}: UseCalendarRangeConfig): UseCalendarRangeResult {
  const connection = useIntervalsConnection();
  const [anchor, setAnchor] = useState(initialAnchor);
  const [state, setState] = useState<CalendarViewState>(LOADING);

  /**
   * Every fetch — effect-driven or from `refresh` — claims the next id
   * before it starts and only applies its result if it is still the latest
   * one when it resolves. Anything that makes an in-flight fetch's result
   * irrelevant (navigating, refreshing, losing the connection, unmounting)
   * bumps it, so a late response can't overwrite newer state — e.g. show
   * workouts for an account that has since been disconnected.
   */
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      requestIdRef.current++;
    },
    [],
  );

  const load = useCallback(
    async (token: string, athleteId: string, options: FetchOptions) => {
      const requestId = ++requestIdRef.current;
      const isStale = () => requestId !== requestIdRef.current;

      try {
        await fetchRange(token, athleteId, anchor, new Date(), options);

        if (isStale()) return;

        setState({
          status: 'ready',
          workoutsByDate: getWorkoutsByDate(startOf(anchor), endOf(anchor)),
          refreshing: false,
        });
      } catch (error) {
        if (error instanceof IntervalsAuthError) {
          // The handler's own failure (e.g. the Firestore delete) must not
          // leave the view stuck mid-load; it clears the cache and flags the
          // reconnect itself regardless.
          await handleIntervalsAuthError(queryClient).catch(() => {});

          if (!isStale()) setState(HIDDEN);

          return;
        }

        if (isStale()) return;

        // A failed refresh keeps the data already on screen (the cache is
        // only replaced on success); anything else has nothing to show.
        setState(prev =>
          options.force && prev.status === 'ready'
            ? { ...prev, refreshing: false }
            : ERROR,
        );
      }
    },
    [anchor, fetchRange, startOf, endOf],
  );

  useEffect(() => {
    if (connection.loading) {
      requestIdRef.current++;
      setState(LOADING);

      return;
    }

    if (
      !connection.isConnected ||
      !connection.accessToken ||
      !connection.athleteId
    ) {
      requestIdRef.current++;
      setState(HIDDEN);

      return;
    }

    if (!isRangeFetched(anchor, connection.athleteId)) {
      setState(LOADING);
    }

    void load(connection.accessToken, connection.athleteId, {});
  }, [
    connection.loading,
    connection.isConnected,
    connection.accessToken,
    connection.athleteId,
    anchor,
    isRangeFetched,
    load,
  ]);

  const refresh = useCallback(() => {
    if (
      !connection.isConnected ||
      !connection.accessToken ||
      !connection.athleteId
    ) {
      return;
    }

    setState(prev =>
      prev.status === 'ready' ? { ...prev, refreshing: true } : LOADING,
    );

    void load(connection.accessToken, connection.athleteId, { force: true });
  }, [
    connection.isConnected,
    connection.accessToken,
    connection.athleteId,
    load,
  ]);

  return {
    state,
    anchor,
    goToPrevious: () => setAnchor(current => step(current, -1)),
    goToNext: () => setAnchor(current => step(current, 1)),
    refresh,
  };
}
