import { useCallback, useEffect, useRef, useState } from 'react';

import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { clearCalendarCache, getWorkoutsByDate } from '@/lib/calendarWorkouts';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import { IntervalsAuthError } from '@/lib/intervalsApi';
import type { CalendarWorkout } from '@/lib/workoutStatus';

export type CalendarViewState =
  | { status: 'hidden' }
  | { status: 'loading' }
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
  ) => Promise<void>;
  isRangeFetched: (anchor: Date) => boolean;
  step: (anchor: Date, direction: -1 | 1) => Date;
}

const HIDDEN: CalendarViewState = { status: 'hidden' };
const LOADING: CalendarViewState = { status: 'loading' };

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
   * one when it resolves. Without this, a refresh left in flight while the
   * athlete navigates to a different range can resolve later and overwrite
   * the newly navigated-to range's data with stale data of its own.
   */
  const requestIdRef = useRef(0);

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

    const requestId = ++requestIdRef.current;
    const token = connection.accessToken;
    const athleteId = connection.athleteId;

    if (!isRangeFetched(anchor)) {
      setState(LOADING);
    }

    (async () => {
      try {
        await fetchRange(token, athleteId, anchor, new Date());

        if (requestId !== requestIdRef.current) return;

        setState({
          status: 'ready',
          workoutsByDate: getWorkoutsByDate(startOf(anchor), endOf(anchor)),
          refreshing: false,
        });
      } catch (error) {
        if (error instanceof IntervalsAuthError) {
          await handleIntervalsAuthError(error);
        }

        if (requestId !== requestIdRef.current) return;

        setState(HIDDEN);
      }
    })();
  }, [
    connection.loading,
    connection.isConnected,
    connection.accessToken,
    connection.athleteId,
    anchor,
    isRangeFetched,
    fetchRange,
    startOf,
    endOf,
  ]);

  const refresh = useCallback(() => {
    if (!connection.accessToken || !connection.athleteId) return;

    const token = connection.accessToken;
    const athleteId = connection.athleteId;
    const requestId = ++requestIdRef.current;

    setState(prev =>
      prev.status === 'ready' ? { ...prev, refreshing: true } : prev,
    );

    clearCalendarCache();

    (async () => {
      try {
        await fetchRange(token, athleteId, anchor, new Date());

        if (requestId !== requestIdRef.current) return;

        setState({
          status: 'ready',
          workoutsByDate: getWorkoutsByDate(startOf(anchor), endOf(anchor)),
          refreshing: false,
        });
      } catch (error) {
        if (error instanceof IntervalsAuthError) {
          await handleIntervalsAuthError(error);
        }

        if (requestId !== requestIdRef.current) return;

        setState(HIDDEN);
      }
    })();
  }, [
    connection.accessToken,
    connection.athleteId,
    anchor,
    fetchRange,
    startOf,
    endOf,
  ]);

  return {
    state,
    anchor,
    goToPrevious: () => setAnchor(current => step(current, -1)),
    goToNext: () => setAnchor(current => step(current, 1)),
    refresh,
  };
}
