import { type WorkoutBlock, profileCeilingPct } from './workoutProfile';

/** The plot a profile is drawn into, in px. */
export interface ProfileBox {
  width: number;
  height: number;
  /** Hairline left between neighbouring bars. */
  gap: number;
}

/**
 * Where one block lands in the plot, in px with y measured down from the top
 * and the plot's bottom edge as the floor every bar stands on.
 */
export interface ProfileBar {
  x: number;
  width: number;
  /** Top of the bar: the block's `maxPct`. */
  capY: number;
  /** Top of the solid fill: the block's `minPct`. Equals `capY` when flat. */
  floorY: number;
  /** On a ramp, the top edge where it starts and where it ends, in ridden order. */
  ramp?: { startY: number; endY: number };
}

/**
 * Lays a Workout Profile's blocks out in a plot: widths in proportion to each
 * block's `widthFraction` of what the gaps leave, heights against the
 * workout's own ceiling, so its tallest block fills the plot. Empty when no
 * block asks for any power, as there's nothing to scale against.
 */
export function profileBars(
  blocks: WorkoutBlock[],
  { width, height, gap }: ProfileBox,
): ProfileBar[] {
  const ceilingPct = profileCeilingPct(blocks);

  if (ceilingPct <= 0) return [];

  const yOf = (pct: number) => height - (pct * height) / ceilingPct;
  const drawable = width - gap * (blocks.length - 1);
  let x = 0;

  return blocks.map(block => {
    const barWidth = block.widthFraction * drawable;
    const bar: ProfileBar = {
      x,
      width: barWidth,
      capY: yOf(block.maxPct),
      floorY: yOf(block.minPct),
    };

    if (block.ramp) {
      bar.ramp = {
        startY: yOf(block.ramp.startPct),
        endY: yOf(block.ramp.endPct),
      };
    }

    x += barWidth + gap;

    return bar;
  });
}

/**
 * An SVG path outlining a bar from `y` down to `bottom` with its top corners
 * rounded. The radius shrinks to fit a bar narrower than two radii or shorter
 * than one. Empty for a bar with no height.
 */
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

  if (height <= 0) return '';

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
