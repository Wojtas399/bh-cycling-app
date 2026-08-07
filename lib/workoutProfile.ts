import {
  type Zone,
  type ZoneConfig,
  bandForZone,
  zoneForFtpPercent,
} from './powerZones';

/** A Power Target as it arrives on a Workout Doc step. */
export interface StepPowerTarget {
  /** `'power_zone'` or `'%ftp'`; any other unit is not drawable. */
  units?: string;
  /** Single-value target: the zone number for `power_zone`, else %FTP. */
  value?: number;
  /** Lower end of a `%ftp` range. */
  start?: number;
  /** Upper end of a `%ftp` range. */
  end?: number;
}

/** One entry of a Workout Doc's ordered `steps[]`, with repeats pre-expanded. */
export interface WorkoutStep {
  /** Length of the step in seconds. */
  duration?: number;
  power?: StepPowerTarget;
}

/** One drawable block of a Workout Profile, in time order. */
export interface WorkoutBlock {
  /** Share of the profile's width this block takes, in `0..1`. */
  widthFraction: number;
  /** Lowest power the step asks for, in %FTP. */
  minPct: number;
  /** Highest power the step asks for, in %FTP. Equals `minPct` when flat. */
  maxPct: number;
  /** Zone the block is coloured by. */
  zone: Zone;
}

/** The %FTP span and zone a step is drawn at, before it is given a width. */
type StepBand = Pick<WorkoutBlock, 'minPct' | 'maxPct' | 'zone'>;

/**
 * Narrowest a block may be drawn, as a share of the profile width — roughly
 * 3–4px on the ~350px-wide profile of a tile. Without it a 30s sprint inside a
 * two-hour ride collapses to an invisible hairline, hiding the very step that
 * gives the session its character.
 */
const MIN_WIDTH_FRACTION = 0.01;

/**
 * How much of a workout's time the drawable steps must account for before a
 * profile is worth drawing. Skipped steps hand their width to their neighbours,
 * so a profile built from a minority of the ride would draw a 20-minute
 * interval as the whole session. Below this share there is no honest shape to
 * show, and the tile is better off degrading to its title and duration.
 */
const MIN_DRAWABLE_DURATION_SHARE = 0.5;

function isUsableNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Splits the profile width between the steps in proportion to their duration,
 * lifting anything narrower than `MIN_WIDTH_FRACTION` up to that floor and
 * taking the difference off the steps that can spare it. Flooring is
 * monotonic in the sorted order — once a fraction clears the floor after
 * rescaling, every larger fraction clears it too, since rescaling shrinks
 * every survivor's share by the same factor — so a single ascending pass
 * finds the floored set without rescanning.
 */
function toWidthFractions(durations: number[]): number[] {
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  const fractions = durations.map(duration => duration / total);

  // Once the floors alone would fill the profile, honouring them would force
  // every block to the same width and misstate the workout's shape — and there
  // is no width left to steal from. Keep the proportions truthful instead.
  if (durations.length * MIN_WIDTH_FRACTION >= 1) return fractions;

  const ascending = fractions
    .map((_, index) => index)
    .sort((a, b) => fractions[a] - fractions[b]);

  let flooredCount = 0;
  let spareSum = 1;
  let scale = 1;

  for (const index of ascending) {
    scale = (1 - MIN_WIDTH_FRACTION * flooredCount) / spareSum;
    if (fractions[index] * scale >= MIN_WIDTH_FRACTION) break;
    flooredCount += 1;
    spareSum -= fractions[index];
  }

  const floored = new Set(ascending.slice(0, flooredCount));

  return fractions.map((fraction, index) =>
    floored.has(index) ? MIN_WIDTH_FRACTION : fraction * scale,
  );
}

/**
 * Resolves a step's Power Target to a %FTP span. `power_zone` targets expand to
 * that zone's band; `%ftp` targets are already in the working unit.
 */
function resolveBand(
  target: StepPowerTarget | undefined,
  config: ZoneConfig,
): StepBand | null {
  if (target?.units === 'power_zone' && isUsableNumber(target.value)) {
    return bandForZone(target.value, config);
  }

  if (target?.units !== '%ftp') return null;

  // A step may carry a range, a single value, or both; the range wins because
  // it is the wider truth, and a lone value is a band of zero height.
  const range = [target.start, target.end].filter(isUsableNumber);
  const bounds =
    range.length > 0 ? range : [target.value].filter(isUsableNumber);

  if (bounds.length === 0) return null;

  const minPct = Math.max(0, Math.min(...bounds));
  const maxPct = Math.max(0, Math.max(...bounds));

  // A band can straddle two zones, so it is coloured by its middle: the same
  // average power that decides which zone the effort trains.
  return {
    minPct,
    maxPct,
    zone: zoneForFtpPercent((minPct + maxPct) / 2, config),
  };
}

/**
 * Turns a Workout Doc's ordered `steps[]` into the drawable block model of its
 * Workout Profile. Presentation-agnostic: it resolves units, proportions, and
 * zones, and leaves every pixel decision to the renderer.
 */
export function buildWorkoutProfile(
  steps: WorkoutStep[] | null | undefined,
  config: ZoneConfig,
): WorkoutBlock[] {
  if (!steps || steps.length === 0) return [];

  // A step needs both a length and a power we can place on a %FTP axis. Steps
  // missing either — a free ride, an HR-targeted effort — are left out rather
  // than guessed at, so an undrawable workout degrades to an empty profile.
  const drawable = steps
    .map(step => ({
      duration: step.duration,
      band: resolveBand(step.power, config),
    }))
    .filter(
      (step): step is { duration: number; band: StepBand } =>
        step.band !== null &&
        isUsableNumber(step.duration) &&
        step.duration > 0,
    );

  if (drawable.length === 0) return [];

  const drawableSeconds = drawable.reduce(
    (sum, step) => sum + step.duration,
    0,
  );
  const totalSeconds = steps.reduce(
    (sum, step) =>
      isUsableNumber(step.duration) && step.duration > 0
        ? sum + step.duration
        : sum,
    0,
  );

  if (drawableSeconds < totalSeconds * MIN_DRAWABLE_DURATION_SHARE) return [];

  // Every block would be flat on the floor, leaving the renderer no ceiling to
  // scale against. There is no profile here, only a horizontal line.
  if (drawable.every(step => step.band.maxPct <= 0)) return [];

  const widthFractions = toWidthFractions(drawable.map(step => step.duration));

  return drawable.map(({ band }, index) => ({
    widthFraction: widthFractions[index],
    ...band,
  }));
}

/**
 * The y-axis ceiling a profile should be drawn against: the workout's own
 * maximum power, so its tallest block reaches full height. Heights are
 * therefore not comparable between workouts — an accepted trade-off, since a
 * shared ceiling would flatten every endurance ride into a sliver.
 *
 * Positive for any profile `buildWorkoutProfile` returns, so scaling a block
 * height by it is always safe; only an empty profile has a ceiling of zero.
 */
export function profileCeilingPct(blocks: WorkoutBlock[]): number {
  return blocks.reduce((ceiling, block) => Math.max(ceiling, block.maxPct), 0);
}
