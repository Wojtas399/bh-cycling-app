export const NOTHING_CROSSED = -1;

export interface LastCrossed {
  get(): number;
  set(value: number): void;
}

export function crossesToJs(next: number, lastCrossed: LastCrossed): boolean {
  'worklet';

  if (next === lastCrossed.get()) return false;

  lastCrossed.set(next);

  return true;
}
