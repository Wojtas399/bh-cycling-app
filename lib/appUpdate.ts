/** The `expo-updates` values that say which bundle the app is running. */
export interface RunningUpdate {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  createdAt: Date | null;
}

export interface RunningUpdateLabels {
  /** January first. */
  monthsShort: readonly string[];
  /** The subtitle from the short ID and date: "Aktualizacja a1b2c3d4 · 31 paź 2026". */
  update: (id: string, date: string) => string;
}

/**
 * The Version row's subtitle when the app runs a downloaded OTA update, which
 * ships under the store build's version string: the update's short ID and its
 * published date. Nothing on the embedded bundle or with updates disabled.
 */
export function formatRunningUpdate(
  update: RunningUpdate,
  labels: RunningUpdateLabels,
): string | undefined {
  const { isEnabled, isEmbeddedLaunch, updateId, createdAt } = update;

  if (!isEnabled || isEmbeddedLaunch || !updateId || !createdAt) {
    return undefined;
  }

  const date = `${createdAt.getDate()} ${labels.monthsShort[createdAt.getMonth()]} ${createdAt.getFullYear()}`;

  return labels.update(updateId.slice(0, 8), date);
}
