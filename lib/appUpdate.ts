import type { NoteDateLabels } from './noteDates';

export interface RunningUpdate {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  createdAt: Date | null;
}

export interface RunningUpdateLabels extends Pick<
  NoteDateLabels,
  'monthsShort'
> {
  update: (shortId: string, date: string) => string;
}

export function formatRunningUpdate(
  running: RunningUpdate,
  labels: RunningUpdateLabels,
): string | undefined {
  const { isEnabled, isEmbeddedLaunch, updateId, createdAt } = running;

  if (!isEnabled || isEmbeddedLaunch || !updateId || !createdAt) {
    return undefined;
  }

  const date = `${createdAt.getDate()} ${labels.monthsShort[createdAt.getMonth()]} ${createdAt.getFullYear()}`;

  return labels.update(updateId.slice(0, 8), date);
}
