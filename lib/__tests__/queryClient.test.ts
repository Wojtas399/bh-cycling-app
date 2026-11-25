import { reportError } from '../errorReporting';
import { handleIntervalsAuthError } from '../handleIntervalsAuthError';
import { ignoreFailure } from '../ignoreFailure';
import { IntervalsAuthError } from '../intervalsApi';
import { removeIntervalsQueries } from '../intervalsQueries';
import { createQueryClient } from '../queryClient';
import { mapChangePasswordError } from '@/app/(app)/change-password/changePasswordErrors';
import { mapDeleteAccountError } from '@/app/(app)/delete-account/deleteAccountErrors';
import { mapForgotPasswordError } from '@/app/(auth)/forgot-password/forgotPasswordErrors';
import { mapSignInError } from '@/app/(auth)/sign-in/signInErrors';
import { mapSignUpError } from '@/app/(auth)/sign-up/signUpErrors';
import {
  NOT_VERIFIED_CODE,
  mapVerifyEmailError,
} from '@/app/(auth)/verify-email/verifyEmailErrors';
import { MutationObserver } from '@tanstack/react-query';

jest.mock('../handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  statusCodes: { SIGN_IN_CANCELLED: 'GOOGLE_SIGN_IN_CANCELLED' },
}));

jest.mock('../errorReporting', () => ({
  reportError: jest.fn(),
}));

const mockHandleIntervalsAuthError = jest.mocked(handleIntervalsAuthError);
const mockReportError = jest.mocked(reportError);

const AUTH_CODES_WITH_A_SPECIFIC_MESSAGE = [
  'auth/wrong-password',
  'auth/invalid-credential',
  'auth/email-already-in-use',
  'auth/weak-password',
  'auth/invalid-email',
  'auth/user-not-found',
  'auth/too-many-requests',
  'auth/user-mismatch',
];

const AUTH_CODES_WITH_ONLY_A_GENERIC_MESSAGE = [
  'auth/user-disabled',
  'auth/operation-not-allowed',
  'auth/requires-recent-login',
  'auth/user-token-expired',
  'auth/invalid-user-token',
  'auth/credential-already-in-use',
  'auth/account-exists-with-different-credential',
  'auth/internal-error',
  'auth/unknown',
];

function codedError(code: string): Error {
  return Object.assign(new Error(`[${code}]`), { code });
}

function aScreenShowsASpecificMessage(code: string): boolean {
  return [
    mapSignInError('emailSignIn', code),
    mapSignUpError('emailSignUp', code),
    mapForgotPasswordError(code),
    mapChangePasswordError('changePassword', code),
    mapChangePasswordError('sendResetEmail', code),
    mapDeleteAccountError(code),
    mapVerifyEmailError(code),
  ].some(({ key }) => !key.endsWith('.generic'));
}

describe('createQueryClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('routes an IntervalsAuthError to the auth-error handler once, without retrying', async () => {
    const client = createQueryClient();
    const queryFn = jest.fn().mockRejectedValue(new IntervalsAuthError());

    await expect(
      client.fetchQuery({ queryKey: ['intervals', 'athlete-1', 'x'], queryFn }),
    ).rejects.toBeInstanceOf(IntervalsAuthError);

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(mockHandleIntervalsAuthError).toHaveBeenCalledTimes(1);
    expect(mockHandleIntervalsAuthError).toHaveBeenCalledWith(client);
  });

  it('leaves any other error alone', async () => {
    const client = createQueryClient();

    await expect(
      client.fetchQuery({
        queryKey: ['intervals', 'athlete-1', 'x'],
        queryFn: () => Promise.reject(new Error('network down')),
      }),
    ).rejects.toThrow('network down');

    expect(mockHandleIntervalsAuthError).not.toHaveBeenCalled();
  });

  it('drops a failed auth-error handler, whose integration delete is best-effort', async () => {
    const unhandledRejection = jest.fn();
    const client = createQueryClient();

    process.on('unhandledRejection', unhandledRejection);
    mockHandleIntervalsAuthError.mockRejectedValueOnce(new Error('offline'));

    await expect(
      client.fetchQuery({
        queryKey: ['intervals', 'athlete-1', 'x'],
        queryFn: () => Promise.reject(new IntervalsAuthError()),
      }),
    ).rejects.toBeInstanceOf(IntervalsAuthError);
    await new Promise(resolve => setImmediate(resolve));
    process.off('unhandledRejection', unhandledRejection);

    expect(unhandledRejection).not.toHaveBeenCalled();
  });

  it('reports an unexpected query error once', async () => {
    const client = createQueryClient();
    const error = new Error('parse failed');

    await expect(
      client.fetchQuery({
        queryKey: ['intervals', 'athlete-1', 'x'],
        queryFn: () => Promise.reject(error),
      }),
    ).rejects.toBe(error);

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith(error);
  });

  it('reports an unexpected mutation error once', async () => {
    const client = createQueryClient();
    const error = new Error('delete failed');
    const mutation = new MutationObserver(client, {
      mutationFn: () => Promise.reject(error),
    });

    await expect(mutation.mutate()).rejects.toBe(error);

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith(error);
  });

  describe.each([
    ['an IntervalsAuthError', new IntervalsAuthError()],
    ['a fetch with no network', new TypeError('Network request failed')],
    ['a fetch that timed out', new TypeError('Network request timed out')],
    [
      'Firebase Auth with no network',
      codedError('auth/network-request-failed'),
    ],
    ['a Cloud Function call with no network', codedError('unavailable')],
    ['a Cloud Function call that timed out', codedError('deadline-exceeded')],
    ['a cancelled Google sign-in', codedError('GOOGLE_SIGN_IN_CANCELLED')],
    [
      'an email the athlete checked before verifying it',
      codedError(NOT_VERIFIED_CODE),
    ],
    ...AUTH_CODES_WITH_A_SPECIFIC_MESSAGE.map(code => [
      `${code}, which a screen shows as a specific message`,
      codedError(code),
    ]),
  ])("doesn't report %s", (_kind, error) => {
    it('from a query', async () => {
      const client = createQueryClient();

      await expect(
        client.fetchQuery({
          queryKey: ['intervals', 'athlete-1', 'x'],
          queryFn: () => Promise.reject(error),
        }),
      ).rejects.toBe(error);

      expect(mockReportError).not.toHaveBeenCalled();
    });

    it('from a mutation', async () => {
      const client = createQueryClient();
      const mutation = new MutationObserver(client, {
        mutationFn: () => Promise.reject(error),
      });

      await expect(mutation.mutate()).rejects.toBe(error);

      expect(mockReportError).not.toHaveBeenCalled();
    });
  });

  it.each(AUTH_CODES_WITH_ONLY_A_GENERIC_MESSAGE)(
    'reports %s, which screens show only as a generic message',
    async code => {
      const client = createQueryClient();
      const error = codedError(code);
      const mutation = new MutationObserver(client, {
        mutationFn: () => Promise.reject(error),
      });

      await expect(mutation.mutate()).rejects.toBe(error);

      expect(mockReportError).toHaveBeenCalledWith(error);
    },
  );

  it('keeps data for the whole session until an explicit refresh', () => {
    jest.useFakeTimers();

    const client = createQueryClient();
    const queryKey = ['intervals', 'athlete-1', 'x'];

    client.setQueryData(queryKey, 'cached');
    jest.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);

    expect(client.getQueryData(queryKey)).toBe('cached');
    expect(client.getQueryCache().find({ queryKey })?.isStale()).toBe(false);
  });
});

describe('the Firebase Auth codes kept out of Sentry', () => {
  it('match the codes a screen maps to a specific message', () => {
    const codes = [
      ...AUTH_CODES_WITH_ONLY_A_GENERIC_MESSAGE,
      ...AUTH_CODES_WITH_A_SPECIFIC_MESSAGE,
    ];

    expect(codes.filter(aScreenShowsASpecificMessage)).toEqual(
      AUTH_CODES_WITH_A_SPECIFIC_MESSAGE,
    );
  });
});

describe('removeIntervalsQueries', () => {
  it('aborts a pending Intervals request and drops it so a late response never refills the cache', async () => {
    const client = createQueryClient();
    let resolveLate: (value: string) => void = () => {};
    let requestSignal: AbortSignal | undefined;
    const intervalsKey = ['intervals', 'athlete-1', 'upcoming', '2026-10-11'];
    const otherKey = ['other'];

    client.setQueryData(otherKey, 'kept');

    const pending = ignoreFailure(() =>
      client.fetchQuery({
        queryKey: intervalsKey,
        queryFn: ({ signal }) => {
          requestSignal = signal;

          return new Promise<string>(resolve => {
            resolveLate = resolve;
          });
        },
      }),
    );

    await removeIntervalsQueries(client);

    expect(requestSignal?.aborted).toBe(true);

    resolveLate('late');
    await pending;

    expect(client.getQueryData(intervalsKey)).toBeUndefined();
    expect(client.getQueryData(otherKey)).toBe('kept');
  });
});
