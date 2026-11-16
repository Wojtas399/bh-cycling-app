import { useAuthState } from '../useAuthState';
import { act, renderHook } from '@testing-library/react-native';

type User = { emailVerified: boolean } | null;

const mockOnUserChanged = jest.fn((_listener: (user: User) => void) =>
  jest.fn(),
);

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ onUserChanged: mockOnUserChanged }),
}));

async function emitUser(user: User) {
  const listener = mockOnUserChanged.mock.calls[0][0];

  await act(() => {
    listener(user);
  });
}

describe('useAuthState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is unknown before Firebase reports the user', async () => {
    const { result } = await renderHook(() => useAuthState());

    expect(result.current).toBe('unknown');
  });

  it('is signed out when Firebase reports no user', async () => {
    const { result } = await renderHook(() => useAuthState());

    await emitUser(null);

    expect(result.current).toBe('signedOut');
  });

  it('is unverified when the user has not verified their email', async () => {
    const { result } = await renderHook(() => useAuthState());

    await emitUser({ emailVerified: false });

    expect(result.current).toBe('unverified');
  });

  it('is verified when the user has verified their email', async () => {
    const { result } = await renderHook(() => useAuthState());

    await emitUser({ emailVerified: true });

    expect(result.current).toBe('verified');
  });

  it('becomes signed out when the session ends mid-session', async () => {
    const { result } = await renderHook(() => useAuthState());

    await emitUser({ emailVerified: true });
    await emitUser(null);

    expect(result.current).toBe('signedOut');
  });

  it('becomes verified when a reload finds the email verified', async () => {
    const { result } = await renderHook(() => useAuthState());

    await emitUser({ emailVerified: false });
    await emitUser({ emailVerified: true });

    expect(result.current).toBe('verified');
  });

  it('is unknown again once nothing listens', async () => {
    const first = await renderHook(() => useAuthState());

    await emitUser({ emailVerified: true });
    await first.unmount();

    const { result } = await renderHook(() => useAuthState());

    expect(result.current).toBe('unknown');
  });

  it('keeps one Firebase listener for every component that reads it', async () => {
    const first = await renderHook(() => useAuthState());
    const second = await renderHook(() => useAuthState());

    await emitUser({ emailVerified: false });

    expect(mockOnUserChanged).toHaveBeenCalledTimes(1);
    expect(first.result.current).toBe('unverified');
    expect(second.result.current).toBe('unverified');
  });
});
