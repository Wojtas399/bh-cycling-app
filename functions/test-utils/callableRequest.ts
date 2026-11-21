import type { DecodedIdToken } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';

const unreadRawRequest = {} as CallableRequest['rawRequest'];

export function callableRequest<T>(
  data: T,
  caller?: { uid: string; claims?: Partial<DecodedIdToken> },
): CallableRequest<T> {
  return {
    data,
    rawRequest: unreadRawRequest,
    acceptsStreaming: false,
    ...(caller && {
      auth: {
        uid: caller.uid,
        token: { ...caller.claims } as DecodedIdToken,
        rawToken: '',
      },
    }),
  };
}
