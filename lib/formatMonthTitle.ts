/**
 * The monthly Calendar's title for the month containing `date`, e.g.
 * "Październik 2026". `monthNames` are the nominative names, January first.
 */
export function formatMonthTitle(
  date: Date,
  monthNames: readonly string[],
): string {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}
