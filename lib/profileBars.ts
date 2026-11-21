import type { Zone } from './powerZones';
import { type WorkoutBlock, profileCeilingPct } from './workoutProfile';

export interface ProfileBoxPx {
  width: number;
  height: number;
  gap: number;
}

export interface ProfileBar {
  x: number;
  width: number;
  zone: Zone;
  shape: 'flat' | 'range' | 'ramp';
  capY: number;
  floorY: number;
  ramp?: { startY: number; endY: number };
}

export function profileBars(
  blocks: WorkoutBlock[],
  { width, height, gap }: ProfileBoxPx,
): ProfileBar[] {
  const ceilingPct = profileCeilingPct(blocks);

  if (ceilingPct <= 0) return [];

  const yDownFromTopOf = (pct: number) => height - (pct * height) / ceilingPct;
  const gapsWouldTakeTheWholeWidth = gap * (blocks.length - 1) >= width;
  const barGap = gapsWouldTakeTheWholeWidth ? 0 : gap;
  const drawable = Math.max(0, width - barGap * (blocks.length - 1));
  let x = 0;

  return blocks.map(block => {
    const barWidth = block.widthFraction * drawable;
    const bar: ProfileBar = {
      x,
      width: barWidth,
      zone: block.zone,
      shape: block.ramp
        ? 'ramp'
        : block.minPct === block.maxPct
          ? 'flat'
          : 'range',
      capY: yDownFromTopOf(block.maxPct),
      floorY: yDownFromTopOf(block.minPct),
    };

    if (block.ramp) {
      bar.ramp = {
        startY: yDownFromTopOf(block.ramp.startPct),
        endY: yDownFromTopOf(block.ramp.endPct),
      };
    }

    x += barWidth + barGap;

    return bar;
  });
}

export function rampPolygonPoints({
  x,
  width,
  bottom,
  startY,
  endY,
}: {
  x: number;
  width: number;
  bottom: number;
  startY: number;
  endY: number;
}): string {
  const right = x + width;

  return [
    `${x},${bottom}`,
    `${x},${startY}`,
    `${right},${endY}`,
    `${right},${bottom}`,
  ].join(' ');
}

export function roundedTopPath({
  x,
  y,
  width,
  bottom,
  radius,
}: {
  x: number;
  y: number;
  width: number;
  bottom: number;
  radius: number;
}): string {
  const height = bottom - y;

  if (height <= 0 || width <= 0) return '';

  const r = Math.min(radius, width / 2, height);
  const right = x + width;

  return [
    `M${x},${bottom}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${right - r}`,
    `Q${right},${y} ${right},${y + r}`,
    `V${bottom}`,
    'Z',
  ].join(' ');
}
