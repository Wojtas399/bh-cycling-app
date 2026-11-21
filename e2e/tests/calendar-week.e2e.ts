import { monthTitle, tapThroughCalendarToolbar } from '../support/calendar';
import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { byComposedLabel, weekRowLabel } from '../support/locators';
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

  await tapThroughCalendarToolbar(screen, screen.getByText(/^Tygodniowy$/));

  const todayRail = byComposedLabel(screen, /, dziś$/);

  await screen.scrollUntilVisible(todayRail, LOAD_TIMEOUT);

  const rowWhetherOrNotTheRidePairs = byComposedLabel(
    screen,
    weekRowLabel({ status: 'any', name }),
  );

  await screen.scrollUntilVisible(rowWhetherOrNotTheRidePairs, LOAD_TIMEOUT);
  await rowWhetherOrNotTheRidePairs.tap();

  await expect(screen.getByTestId('workout-details-profile')).toBeVisible(
    LOAD_TIMEOUT,
  );
});
