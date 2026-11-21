import { formatMetric } from './formatWorkoutMetric';
import { formatLocalTime } from './localDateTime';
import type { RouteSummary } from './route';

export type RouteChip = 'distance' | 'start' | 'finish';

export function formatRouteDistance(
  summary: Pick<RouteSummary, 'distanceMeters'>,
): string | undefined {
  return summary.distanceMeters === undefined
    ? undefined
    : formatMetric('distance', summary.distanceMeters);
}

export function routeChips(
  summary: RouteSummary,
): { chip: RouteChip; value: string }[] {
  const values: [RouteChip, string | undefined][] = [
    ['distance', formatRouteDistance(summary)],
    ['start', formatLocalTime(summary.startLocal)],
    ['finish', summary.finishLocal && formatLocalTime(summary.finishLocal)],
  ];

  return values.flatMap(([chip, value]) =>
    value === undefined ? [] : [{ chip, value }],
  );
}
