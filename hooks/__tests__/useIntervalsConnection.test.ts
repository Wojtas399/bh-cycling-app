import { useIntervalsConnection } from '../useIntervalsConnection';
import { act, renderHook } from '@testing-library/react-native';

const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn(() => ({ onSnapshot: mockOnSnapshot }));
let mockCurrentUser: { uid: string } | null = { uid: 'user-1' };

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ currentUser: mockCurrentUser }),
  firestore: () => ({ doc: mockDoc }),
}));

async function emitSnapshot(data: Record<string, unknown> | undefined) {
  const onNext = mockOnSnapshot.mock.calls[0][0] as (snapshot: {
    data: () => Record<string, unknown> | undefined;
  }) => void;

  await act(() => {
    onNext({ data: () => data });
  });
}

describe('useIntervalsConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'user-1' };
  });

  it('is loading before the first snapshot resolves', async () => {
    const { result } = await renderHook(() => useIntervalsConnection());

    expect(result.current.loading).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(mockDoc).toHaveBeenCalledWith('users/user-1/integrations/intervals');
  });

  it('is not connected when no document exists', async () => {
    const { result } = await renderHook(() => useIntervalsConnection());

    await emitSnapshot(undefined);

    expect(result.current).toEqual({
      isConnected: false,
      athleteName: null,
      athleteId: null,
      accessToken: null,
      scope: null,
      loading: false,
    });
  });

  it('is connected with populated fields, the granted scope included, when the document exists', async () => {
    const { result } = await renderHook(() => useIntervalsConnection());

    await emitSnapshot({
      accessToken: 'token-1',
      athleteId: 'athlete-1',
      athleteName: 'Jane Rider',
      scope: 'ACTIVITY:READ,CALENDAR:READ',
    });

    expect(result.current).toEqual({
      isConnected: true,
      athleteName: 'Jane Rider',
      athleteId: 'athlete-1',
      accessToken: 'token-1',
      scope: 'ACTIVITY:READ,CALENDAR:READ',
      loading: false,
    });
  });

  it('reports no scope for a connection stored without one', async () => {
    const { result } = await renderHook(() => useIntervalsConnection());

    await emitSnapshot({ accessToken: 'token-1', athleteId: 'athlete-1' });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.scope).toBeNull();
  });

  it('transitions to not connected when the document is deleted mid-session', async () => {
    const { result } = await renderHook(() => useIntervalsConnection());

    await emitSnapshot({
      accessToken: 'token-1',
      athleteId: 'athlete-1',
      athleteName: 'Jane Rider',
    });

    expect(result.current.isConnected).toBe(true);

    await emitSnapshot(undefined);

    expect(result.current.isConnected).toBe(false);
  });

  it('does not crash and reports not connected when the snapshot listener errors', async () => {
    const { result } = await renderHook(() => useIntervalsConnection());

    const onNext = mockOnSnapshot.mock.calls[0][0] as (
      snapshot: null,
      error: Error,
    ) => void;

    await act(() => {
      onNext(null, new Error('permission-denied'));
    });

    expect(result.current).toEqual({
      isConnected: false,
      athleteName: null,
      athleteId: null,
      accessToken: null,
      scope: null,
      loading: false,
    });
  });

  it('is not connected and not loading when signed out, without listening', async () => {
    mockCurrentUser = null;

    const { result } = await renderHook(() => useIntervalsConnection());

    expect(result.current).toEqual({
      isConnected: false,
      athleteName: null,
      athleteId: null,
      accessToken: null,
      scope: null,
      loading: false,
    });
    expect(mockDoc).not.toHaveBeenCalled();
  });

  it('listens once, however often it re-renders', async () => {
    const { rerender } = await renderHook(() => useIntervalsConnection());

    await rerender({});
    await rerender({});

    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it('stops listening when unmounted', async () => {
    const unsubscribe = jest.fn();

    mockOnSnapshot.mockReturnValueOnce(unsubscribe);

    const { unmount } = await renderHook(() => useIntervalsConnection());

    await unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
