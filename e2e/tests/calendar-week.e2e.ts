import { monthTitle, tapCenter } from '../support/calendar';
import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test("Kalendarz → Tygodniowy → today's E2E Sweet Spot row → Workout Details", async ({
  screen,
}) => {
  const today = new Date();
  const { name } = planSeed(today).events.sweetSpot;

  await signIn(screen);

  await screen.getByText(/Kalendarz/).tap();
  await expect(screen.getByText(monthTitle(today))).toBeVisible(LOAD_TIMEOUT);

  // The view toggle sits in the Calendar header, under iOS's "Toolbar".
  await tapCenter(screen, screen.getByText(/^Tygodniowy$/));

  // Each day's rail is read as "<Weekday>, <day> <month>", and today's ends
  // ", dziś". Found by label: the engine reports iOS's header trait as
  // "other", not "heading".
  const todayRail = screen.getByLabel(/, dziś$/);

  await screen.scrollUntilVisible(todayRail, LOAD_TIMEOUT);

  // A row is one button read by its composed label, its Workout Status
  // first: "Trening zaplanowany, E2E Sweet Spot, 1 godz.". The status
  // depends on whether the seeded ride pairs to it.
  const row = screen.getByLabel(new RegExp(`^Trening \\S+, ${name}(,|$)`));

  await screen.scrollUntilVisible(row, LOAD_TIMEOUT);
  await row.tap();

  await expect(screen.getByTestId('workout-details-profile')).toBeVisible(
    LOAD_TIMEOUT,
  );
});
