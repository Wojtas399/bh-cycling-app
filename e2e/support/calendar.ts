import pl from '../../i18n/locales/pl';
import { formatMonthTitle } from '../../lib/formatMonthTitle';
import type { Locator, Screen } from 'e2e';

const { monthNames } = pl.calendar;

/** The monthly Calendar's title for `date`'s month, matched whole. */
export function monthTitle(date: Date): RegExp {
  return new RegExp(`^${formatMonthTitle(date, monthNames)}$`);
}

/**
 * Taps the middle of `target` as a point. On iOS the tree reports a
 * full-screen "Toolbar" over the Calendar header, so a locator tap there is
 * refused as covered, though nothing covers it on screen.
 */
export async function tapCenter(
  screen: Screen,
  target: Locator,
): Promise<void> {
  const box = await target.boundingBox();

  if (!box) throw new Error('The tap target has no bounds.');

  await screen.tapAt({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
}
