import { useNoteDetails } from '../useNoteDetails';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  IntervalsApiError,
  type IntervalsCalendarEvent,
  getCalendarEvent,
  isNotFoundError,
} from '@/lib/intervalsApi';
import { intervalsKeys } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvent: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = jest.mocked(useIntervalsConnection);
const mockGetCalendarEvent = jest.mocked(getCalendarEvent);

const EVENT_ID = 7;

function mockConnection(
  overrides: Partial<ReturnType<typeof useIntervalsConnection>> = {},
) {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: false,
    athleteName: null,
    athleteId: null,
    accessToken: null,
    scope: null,
    loading: false,
    ...overrides,
  });
}

function mockConnected() {
  mockConnection({
    isConnected: true,
    accessToken: 'token-1',
    athleteId: 'athlete-1',
  });
}

const NOTE_EVENT: IntervalsCalendarEvent = {
  id: EVENT_ID,
  category: 'NOTE',
  name: 'Camp briefing',
  start_date_local: '2026-11-20T00:00:00',
};

function renderDetails() {
  return renderHookWithClient(() => useNoteDetails(EVENT_ID));
}

describe('useNoteDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
  });

  it('is loading and fetches nothing while the connection resolves', async () => {
    mockConnection({ loading: true });

    const { result } = await renderDetails();

    expect(result.current.availability).toBe('loading');
    expect(mockGetCalendarEvent).not.toHaveBeenCalled();
  });

  it('is unavailable and fetches nothing when not connected', async () => {
    mockConnection();

    const { result } = await renderDetails();

    expect(result.current.availability).toBe('unavailable');
    expect(mockGetCalendarEvent).not.toHaveBeenCalled();
  });

  it('loads the Note by its event id when connected', async () => {
    mockConnected();
    mockGetCalendarEvent.mockResolvedValue(NOTE_EVENT);

    const { result } = await renderDetails();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.availability).toBe('available');
    expect(result.current.query.data).toMatchObject({
      id: EVENT_ID,
      name: 'Camp briefing',
    });
  });

  it('fails as not found when the event is not a Note', async () => {
    mockConnected();
    mockGetCalendarEvent.mockResolvedValue({
      id: EVENT_ID,
      category: 'WORKOUT',
      name: 'Sweet spot',
      start_date_local: '2026-11-20T08:00:00',
    });

    const { result } = await renderDetails();

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(isNotFoundError(result.current.query.error)).toBe(true);
  });

  it('fails as not found when the event was deleted', async () => {
    mockConnected();
    mockGetCalendarEvent.mockRejectedValue(new IntervalsApiError(404));

    const { result } = await renderDetails();

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(isNotFoundError(result.current.query.error)).toBe(true);
  });

  it('refetches only this query on refetch', async () => {
    mockConnected();
    mockGetCalendarEvent.mockResolvedValue(NOTE_EVENT);

    const { result, client } = await renderDetails();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    const otherKey = intervalsKeys.upcoming('athlete-1', '2026-11-20');

    client.setQueryData(otherKey, []);
    const before = client.getQueryState(otherKey)?.dataUpdatedAt;

    await act(() => result.current.refetch());

    expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
    expect(client.getQueryState(otherKey)?.dataUpdatedAt).toBe(before);
  });
});
