import pl from '../../i18n/locales/pl';
import { formatMonthTitle } from '../../lib/formatMonthTitle';
import type { Locator, Screen } from 'e2e';

const { monthNames } = pl.calendar;

export function monthTitle(date: Date): RegExp {
  return new RegExp(`^${formatMonthTitle(date, monthNames)}$`);
}

export async function tapThroughCalendarToolbar(
  screen: Screen,
  target: Locator,
): Promise<void> {
  const box = await target.boundingBox();

  if (!box) throw new Error('The tap target has no bounds.');

  await screen.tapAt({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
}
