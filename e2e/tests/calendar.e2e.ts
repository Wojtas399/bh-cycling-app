import { monthTitle, tapCenter } from '../support/calendar';
import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('Kalendarz → Następny shows E2E Endurance → Dziś comes back', async ({
  screen,
}) => {
  const today = new Date();
  const { sweetSpot, endurance } = planSeed(today).events;
  const { date, day } = endurance;
  const currentMonth = monthTitle(today);

  await signIn(screen);

  await screen.getByText(/Kalendarz/).tap();

  await expect(screen.getByText(currentMonth)).toBeVisible(LOAD_TIMEOUT);
  // Each day is one accessible button, so iOS hides the `calendar-today`
  // marker inside it. Today's cell is the one that stays reachable.
  await expect(
    screen.getByTestId(`calendar-day-${sweetSpot.date}`),
  ).toBeVisible();

  // The chevron has no visible text, only its accessibility label.
  await tapCenter(screen, screen.getByLabel(/^Następny$/));

  await expect(screen.getByText(monthTitle(day))).toBeVisible();
  // The day's label is "<day>. <counts>", Workouts first, e.g.
  // "Wtorek, 15 grudnia. 1 trening".
  await expect(screen.getByTestId(`calendar-day-${date}`)).toHaveAccessibleName(
    /\. 1 trening(,|$)/,
    LOAD_TIMEOUT,
  );

  await tapCenter(screen, screen.getByText(/^Dziś$/));

  await expect(screen.getByText(currentMonth)).toBeVisible();
});
