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

/** Open sheet-level hosts, oldest first; the last one is on top. */
const sheetHosts: string[] = [];

/**
 * Marks the sheet-level host `id` as open. Toasts go to the most recently
 * registered open host, so a toast shows above the top-most sheet.
 */
export function registerSheetHost(id: string) {
  sheetHosts.push(id);
}

/**
 * Marks the sheet-level host `id` as closed. Toasts fall back to the previous
 * open host, or to the root host. Unregistering a closed host does nothing.
 */
export function unregisterSheetHost(id: string) {
  const index = sheetHosts.lastIndexOf(id);

  if (index !== -1) {
    sheetHosts.splice(index, 1);
  }
}

function show(variant: ToastVariant, message: string) {
  const id = `toast-${++lastId}`;

  sonner[variant](message, {
    id,
    duration: DURATION_MS,
    toasterId: sheetHosts.at(-1),
    // Tap-to-dismiss is the toast's only interaction.
    onPress: () => sonner.dismiss(id),
  });
  Haptics.notificationAsync(HAPTIC[variant]);
}

export const toast = {
  success: (message: string) => show('success', message),
  warning: (message: string) => show('warning', message),
  error: (message: string) => show('error', message),
};
