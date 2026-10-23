import { formatMetric } from './formatWorkoutMetric';
import { formatLocalTime } from './localDateTime';
import type { RouteSummary } from './route';

/** A chip along the bottom of the full-screen Route map. */
export type RouteChip = 'distance' | 'start' | 'finish';

/**
 * The Route's distance with the app's distance formatting, as on the
 * Wykonanie card. `undefined` when the summary has none.
 */
export function formatRouteDistance(
  summary: Pick<RouteSummary, 'distanceMeters'>,
): string | undefined {
  return summary.distanceMeters === undefined
    ? undefined
    : formatMetric('distance', summary.distanceMeters);
}

/**
 * The full-screen map's chips, in display order: the distance, the start time
 * and the finish time (both `H:mm`). A chip whose value is absent is left out.
 */
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
