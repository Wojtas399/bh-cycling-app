import { useCallback, useEffect, useRef, useState } from 'react';

import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  clearCalendarCache,
  endOfMonth,
  fetchMonth,
  getWorkoutsByDate,
  isMonthFetched,
  startOfMonth,
} from '@/lib/calendarWorkouts';
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

export interface UseMonthlyCalendarResult {
  state: CalendarViewState;
  month: Date;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  refresh: () => void;
}

const HIDDEN: CalendarViewState = { status: 'hidden' };
const LOADING: CalendarViewState = { status: 'loading' };

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function useMonthlyCalendar(): UseMonthlyCalendarResult {
  const connection = useIntervalsConnection();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [state, setState] = useState<CalendarViewState>(LOADING);

  /**
   * Every fetch — effect-driven or from `refresh` — claims the next id
   * before it starts and only applies its result if it is still the latest
   * one when it resolves. Without this, a refresh left in flight while the
   * athlete navigates to a different month can resolve later and overwrite
   * the newly navigated-to month's data with stale data of its own.
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

    if (!isMonthFetched(month)) {
      setState(LOADING);
    }

    (async () => {
      try {
        await fetchMonth(token, athleteId, month, new Date());

        if (requestId !== requestIdRef.current) return;

        setState({
          status: 'ready',
          workoutsByDate: getWorkoutsByDate(
            startOfMonth(month),
            endOfMonth(month),
          ),
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
    month,
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
        await fetchMonth(token, athleteId, month, new Date());

        if (requestId !== requestIdRef.current) return;

        setState({
          status: 'ready',
          workoutsByDate: getWorkoutsByDate(
            startOfMonth(month),
            endOfMonth(month),
          ),
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
  }, [connection.accessToken, connection.athleteId, month]);

  return {
    state,
    month,
    goToPreviousMonth: () => setMonth(current => addMonths(current, -1)),
    goToNextMonth: () => setMonth(current => addMonths(current, 1)),
    refresh,
  };
}
