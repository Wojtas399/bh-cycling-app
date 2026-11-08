import pl from '../../i18n/locales/pl';
import { formatMonthTitle } from '../../lib/formatMonthTitle';
import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

const { monthNames } = pl.calendar;

/** The monthly Calendar's title for `date`'s month, matched whole. */
function monthTitle(date: Date): RegExp {
  return new RegExp(`^${formatMonthTitle(date, monthNames)}$`);
}

test('Kalendarz → Następny shows E2E Endurance → Dziś comes back', async ({
  screen,
}) => {
  const today = new Date();
  const { date, day } = planSeed(today).events.endurance;
  const currentMonth = monthTitle(today);

  await signIn(screen);

  await screen.getByText(/Kalendarz/).tap();

  await expect(screen.getByText(currentMonth)).toBeVisible(LOAD_TIMEOUT);
  await expect(screen.getByTestId('calendar-today')).toBeVisible();

  // The chevron has no visible text, only its accessibility label.
  await screen.getByLabel(/^Następny$/).tap();

  await expect(screen.getByText(monthTitle(day))).toBeVisible();
  // The day's label is "<day>. <counts>", Workouts first, e.g.
  // "Wtorek, 15 grudnia. 1 trening".
  await expect(screen.getByTestId(`calendar-day-${date}`)).toHaveAccessibleName(
    /\. 1 trening(,|$)/,
    LOAD_TIMEOUT,
  );

  await screen.getByText(/^Dziś$/).tap();

  await expect(screen.getByText(currentMonth)).toBeVisible();
});
