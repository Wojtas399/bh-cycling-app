import { Y_LABEL_GUTTER_PX, plotWidthOf } from '../../lib/profilePlot';
import type { Locator, Screen } from 'e2e';

const HEIGHT_SHARE_ACROSS_THE_STRIPS = 0.4;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pointOnProfilePlot(
  card: Bounds,
  plotShare: number,
): { x: number; y: number } {
  return {
    x: card.x + Y_LABEL_GUTTER_PX + plotShare * plotWidthOf(card.width),
    y: card.y + card.height * HEIGHT_SHARE_ACROSS_THE_STRIPS,
  };
}

export async function scrubProfile(
  screen: Screen,
  card: Locator,
  { from, to }: { from: number; to: number },
): Promise<void> {
  const box = await card.boundingBox();

  if (!box) throw new Error('The profile card has no bounds.');

  await screen.swipe({
    from: pointOnProfilePlot(box, from),
    to: pointOnProfilePlot(box, to),
    duration: 600,
  });
}
