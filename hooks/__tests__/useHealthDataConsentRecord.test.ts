import { useHealthDataConsentRecord } from '../useHealthDataConsentRecord';
import { act, renderHook } from '@testing-library/react-native';

type SnapshotListener = (
  snapshot: { data: () => Record<string, unknown> | undefined } | null,
  error?: Error,
) => void;

const mockOnSnapshot = jest.fn<() => void, [onNext: SnapshotListener]>();
const mockDoc = jest.fn(() => ({ onSnapshot: mockOnSnapshot }));
let mockCurrentUser: { uid: string } | null = { uid: 'user-1' };

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ currentUser: mockCurrentUser }),
  firestore: () => ({ doc: mockDoc }),
}));

async function emitSnapshot(data: Record<string, unknown> | undefined) {
  const onNext = mockOnSnapshot.mock.calls[0][0];

  await act(() => {
    onNext({ data: () => data });
  });
}

const NO_RECORD = { loading: false, record: null };

describe('useHealthDataConsentRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'user-1' };
  });

  it("is loading before the first snapshot of the athlete's consent record resolves", async () => {
    const { result } = await renderHook(() => useHealthDataConsentRecord());

    expect(result.current).toEqual({ loading: true, record: null });
    expect(mockDoc).toHaveBeenCalledWith('users/user-1/consents/healthData');
  });

  it('holds the consent version of a stored record', async () => {
    const { result } = await renderHook(() => useHealthDataConsentRecord());

    await emitSnapshot({
      consentVersion: 1,
      ageConfirmed: true,
      givenAt: { seconds: 1, nanoseconds: 0 },
    });

    expect(result.current).toEqual({
      loading: false,
      record: { consentVersion: 1 },
    });
  });

  it('holds no record when none is stored', async () => {
    const { result } = await renderHook(() => useHealthDataConsentRecord());

    await emitSnapshot(undefined);

    expect(result.current).toEqual(NO_RECORD);
  });

  it('holds no record for a document that does not match the expected shape', async () => {
    const { result } = await renderHook(() => useHealthDataConsentRecord());

    await emitSnapshot({ consentVersion: '1' });

    expect(result.current).toEqual(NO_RECORD);
  });

  it('holds no record, rather than loading for ever, when the snapshot listener errors', async () => {
    const { result } = await renderHook(() => useHealthDataConsentRecord());
    const onNext = mockOnSnapshot.mock.calls[0][0];

    await act(() => {
      onNext(null, new Error('permission-denied'));
    });

    expect(result.current).toEqual(NO_RECORD);
  });

  it('holds no record and is not loading when signed out, without listening', async () => {
    mockCurrentUser = null;

    const { result } = await renderHook(() => useHealthDataConsentRecord());

    expect(result.current).toEqual(NO_RECORD);
    expect(mockDoc).not.toHaveBeenCalled();
  });

  it('stops listening when unmounted', async () => {
    const unsubscribe = jest.fn();

    mockOnSnapshot.mockReturnValueOnce(unsubscribe);

    const { unmount } = await renderHook(() => useHealthDataConsentRecord());

    await unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
