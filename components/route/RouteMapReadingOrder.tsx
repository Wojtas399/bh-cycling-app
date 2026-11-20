import { Fragment, type ReactNode } from 'react';

import {
  type RouteMapLayer,
  inRouteMapReadingOrder,
} from '@/lib/routeMapReadingOrder';

export default function RouteMapReadingOrder(
  layers: Partial<Record<RouteMapLayer, ReactNode>>,
) {
  return (
    <>
      {inRouteMapReadingOrder(layers).map(([layer, content]) => (
        <Fragment key={layer}>{content}</Fragment>
      ))}
    </>
  );
}
