import { useCallback, useEffect, useRef, useState } from 'react';

import type { CalendarViewState } from './useMonthlyCalendar';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  clearCalendarCache,
  endOfWeek,
  fetchWeek,
  getWorkoutsByDate,
  isWeekFetched,
  startOfWeek,
} from '@/lib/calendarWorkouts';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import { IntervalsAuthError } from '@/lib/intervalsApi';
import { addDays } from '@/lib/localDate';

export type { CalendarViewState };

export interface UseWeeklyCalendarResult {
  state: CalendarViewState;
  /** Monday of the currently visible week. */
  week: Date;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  refresh: () => void;
}

const HIDDEN: CalendarViewState = { status: 'hidden' };
const LOADING: CalendarViewState = { status: 'loading' };

export function useWeeklyCalendar(): UseWeeklyCalendarResult {
  const connection = useIntervalsConnection();
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [state, setState] = useState<CalendarViewState>(LOADING);

  /**
   * Every fetch — effect-driven or from `refresh` — claims the next id
   * before it starts and only applies its result if it is still the latest
   * one when it resolves. Without this, a refresh left in flight while the
   * athlete navigates to a different week can resolve later and overwrite
   * the newly navigated-to week's data with stale data of its own.
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

    if (!isWeekFetched(week)) {
      setState(LOADING);
    }

    (async () => {
      try {
        await fetchWeek(token, athleteId, week, new Date());

        if (requestId !== requestIdRef.current) return;

        setState({
          status: 'ready',
          workoutsByDate: getWorkoutsByDate(startOfWeek(week), endOfWeek(week)),
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
    week,
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
        await fetchWeek(token, athleteId, week, new Date());

        if (requestId !== requestIdRef.current) return;

        setState({
          status: 'ready',
          workoutsByDate: getWorkoutsByDate(startOfWeek(week), endOfWeek(week)),
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
  }, [connection.accessToken, connection.athleteId, week]);

  return {
    state,
    week,
    goToPreviousWeek: () => setWeek(current => addDays(current, -7)),
    goToNextWeek: () => setWeek(current => addDays(current, 7)),
    refresh,
  };
}
