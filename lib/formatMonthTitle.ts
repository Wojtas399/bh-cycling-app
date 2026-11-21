export function formatMonthTitle(
  date: Date,
  nominativeMonthNamesFromJanuary: readonly string[],
): string {
  return `${nominativeMonthNamesFromJanuary[date.getMonth()]} ${date.getFullYear()}`;
}
