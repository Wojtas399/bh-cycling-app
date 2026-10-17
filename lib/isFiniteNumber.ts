/** A real number: not null or undefined, not NaN, not ±Infinity. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
