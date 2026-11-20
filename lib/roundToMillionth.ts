export function roundToMillionth(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
