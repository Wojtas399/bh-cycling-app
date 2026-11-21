import { monthTitle, tapThroughCalendarToolbar } from '../support/calendar';
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
  const oneWorkoutFirstInDayCounts = /\. 1 trening(,|$)/;

  await signIn(screen);

  await screen.getByText(/Kalendarz/).tap();

  await expect(screen.getByText(currentMonth)).toBeVisible(LOAD_TIMEOUT);
  await expect(
    screen.getByTestId(`calendar-day-${sweetSpot.date}`),
  ).toBeVisible();

  const textlessNextChevron = screen.getByLabel(/^Następny$/);

  await tapThroughCalendarToolbar(screen, textlessNextChevron);

  await expect(screen.getByText(monthTitle(day))).toBeVisible();
  await expect(screen.getByTestId(`calendar-day-${date}`)).toHaveAccessibleName(
    oneWorkoutFirstInDayCounts,
    LOAD_TIMEOUT,
  );

  await tapThroughCalendarToolbar(screen, screen.getByText(/^Dziś$/));

  await expect(screen.getByText(currentMonth)).toBeVisible();
});
