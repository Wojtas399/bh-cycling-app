import { monthTitle } from '../support/calendar';
import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('Home → E2E Briefing → Note Details', async ({ screen }) => {
  const { name, description } = planSeed(new Date()).events.note;

  await signIn(screen);

  // The card is one button read by its own label, so iOS hides the visible
  // name and "Dziś" inside it.
  const card = screen.getByLabel(new RegExp(`^Notatka: ${name}, Dziś$`));

  await screen.scrollUntilVisible(card, LOAD_TIMEOUT);
  // The card can stop under the tab bar, above only E2E Goal Race, so swipe
  // it clear before tapping.
  await screen.swipe({ direction: 'down' });
  await card.tap();

  // The Home card stays in the tree under Note Details, so match the title
  // whole. The header shows no title until the top block scrolls under it.
  await expect(screen.getByText(new RegExp(`^${name}$`))).toBeVisible(
    LOAD_TIMEOUT,
  );
  await expect(screen.getByText(new RegExp(`^${description}$`))).toBeVisible();
});

test('Kalendarz → today → E2E Briefing closes the day sheet for Note Details', async ({
  screen,
}) => {
  const today = new Date();
  const { name, description, date } = planSeed(today).events.note;

  await signIn(screen);

  await screen.getByText(/Kalendarz/).tap();
  await expect(screen.getByText(monthTitle(today))).toBeVisible(LOAD_TIMEOUT);

  // The day's label is "<day>. <counts>", Notes last.
  const dayCell = screen.getByTestId(`calendar-day-${date}`);

  await expect(dayCell).toHaveAccessibleName(/ notat/, LOAD_TIMEOUT);
  await dayCell.tap();

  // In the day sheet a Note card's label ends in the sheet's day, not "Dziś".
  const daySheet = screen.getByTestId('calendar-day-sheet');
  const card = daySheet.getByLabel(new RegExp(`^Notatka: ${name}, `));

  await expect(card).toBeVisible();
  await card.tap();

  await expect(daySheet).toBeHidden();
  // A pushed screen's back arrow, which no sheet has.
  const back = screen.getByLabel(/^Wstecz$/);

  await expect(back).toBeVisible();
  await expect(screen.getByText(new RegExp(`^${name}$`))).toBeVisible(
    LOAD_TIMEOUT,
  );
  await expect(screen.getByText(new RegExp(`^${description}$`))).toBeVisible();

  // The sheet runs its chained action once, so one back returns to the
  // Calendar. A second run would have pushed a second Note Details.
  await back.tap();

  await expect(screen.getByText(monthTitle(today))).toBeVisible();
  await expect(back).toBeHidden();
  await expect(daySheet).toBeHidden();
});
