import * as Haptics from 'expo-haptics';
import { toast as sonner } from 'sonner-native';

type ToastVariant = 'success' | 'warning' | 'error';

const HAPTIC: Record<ToastVariant, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

const DURATION_MS = 3000;

let lastId = 0;

const openSheetHostsOldestFirst: string[] = [];

export function registerSheetHost(id: string) {
  openSheetHostsOldestFirst.push(id);
}

export function unregisterSheetHost(id: string) {
  const index = openSheetHostsOldestFirst.lastIndexOf(id);

  if (index !== -1) {
    openSheetHostsOldestFirst.splice(index, 1);
  }
}

function show(variant: ToastVariant, message: string) {
  const id = `toast-${++lastId}`;

  sonner[variant](message, {
    id,
    duration: DURATION_MS,
    toasterId: openSheetHostsOldestFirst.at(-1),
    onPress: () => sonner.dismiss(id),
  });
  Haptics.notificationAsync(HAPTIC[variant]);
}

export const toast = {
  success: (message: string) => show('success', message),
  warning: (message: string) => show('warning', message),
  error: (message: string) => show('error', message),
};
