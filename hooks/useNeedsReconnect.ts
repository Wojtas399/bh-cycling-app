import { useSyncExternalStore } from 'react';

import {
  getNeedsReconnect,
  subscribeNeedsReconnect,
} from '@/lib/intervalsReconnectStore';

export function useNeedsReconnect(): boolean {
  return useSyncExternalStore(
    subscribeNeedsReconnect,
    getNeedsReconnect,
    getNeedsReconnect,
  );
}
