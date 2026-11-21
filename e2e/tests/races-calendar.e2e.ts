import { monthTitle, tapThroughCalendarToolbar } from '../support/calendar';
import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { byComposedLabel, wholeText } from '../support/locators';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('Kalendarz → tomorrow → E2E Goal Race swaps the day sheet for the Race sheet', async ({
  screen,
}) => {
  const today = new Date();
  const { name, date, day } = planSeed(today).events.race;

  await signIn(screen);

  await screen.getByText(/Kalendarz/).tap();
  await expect(screen.getByText(monthTitle(today))).toBeVisible(LOAD_TIMEOUT);

  const raceCellIsAnUntappablePaddingDay = day.getMonth() !== today.getMonth();

  if (raceCellIsAnUntappablePaddingDay) {
    await tapThroughCalendarToolbar(screen, screen.getByLabel(/^Następny$/));
    await expect(screen.getByText(monthTitle(day))).toBeVisible();
  }

  const aRaceFirstInDayCounts = /\. wyścig A(,|$)/;
  const dayCell = screen.getByTestId(`calendar-day-${date}`);

  await expect(dayCell).toHaveAccessibleName(
    aRaceFirstInDayCounts,
    LOAD_TIMEOUT,
  );
  await dayCell.tap();

  const daySheet = screen.getByTestId('calendar-day-sheet');
  const tile = byComposedLabel(
    daySheet,
    new RegExp(`^Wyścig A: ${name}, Bieg$`),
  );

  await expect(tile).toBeVisible();
  await tile.tap();

  const raceSheet = screen.getByTestId('race-detail-sheet');

  await expect(daySheet).toBeHidden();
  await expect(raceSheet.getByText(wholeText(name))).toBeVisible();
});
