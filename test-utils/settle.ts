import { act } from '@testing-library/react-native';

export function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function settleQueries(): Promise<void> {
  await act(flushPromises);
}
