import { monthTitle } from '../support/calendar';
import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import {
  byComposedLabel,
  tapClearOfTabBar,
  wholeText,
} from '../support/locators';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('Home → E2E Briefing → Note Details', async ({ screen }) => {
  const { name, description } = planSeed(new Date()).events.note;

  await signIn(screen);

  const card = byComposedLabel(screen, new RegExp(`^Notatka: ${name}, Dziś$`));

  await screen.scrollUntilVisible(card, LOAD_TIMEOUT);
  await tapClearOfTabBar(screen, card);

  await expect(screen.getByText(wholeText(name))).toBeVisible(LOAD_TIMEOUT);
  await expect(screen.getByText(wholeText(description))).toBeVisible();
});

test('Kalendarz → today → E2E Briefing closes the day sheet for Note Details, and one back returns to Kalendarz', async ({
  screen,
}) => {
  const today = new Date();
  const { name, description, date } = planSeed(today).events.note;

  await signIn(screen);

  await screen.getByText(/Kalendarz/).tap();
  await expect(screen.getByText(monthTitle(today))).toBeVisible(LOAD_TIMEOUT);

  const notesLastInDayCounts = / notat/;
  const dayCell = screen.getByTestId(`calendar-day-${date}`);

  await expect(dayCell).toHaveAccessibleName(
    notesLastInDayCounts,
    LOAD_TIMEOUT,
  );
  await dayCell.tap();

  const daySheet = screen.getByTestId('calendar-day-sheet');
  const cardEndingInTheSheetsDay = byComposedLabel(
    daySheet,
    new RegExp(`^Notatka: ${name}, `),
  );

  await expect(cardEndingInTheSheetsDay).toBeVisible();
  await cardEndingInTheSheetsDay.tap();

  await expect(daySheet).toBeHidden();
  const pushedScreenBack = screen.getByLabel(/^Wstecz$/);

  await expect(pushedScreenBack).toBeVisible();
  await expect(screen.getByText(wholeText(name))).toBeVisible(LOAD_TIMEOUT);
  await expect(screen.getByText(wholeText(description))).toBeVisible();

  await pushedScreenBack.tap();

  await expect(screen.getByText(monthTitle(today))).toBeVisible();
  await expect(pushedScreenBack).toBeHidden();
  await expect(daySheet).toBeHidden();
});
