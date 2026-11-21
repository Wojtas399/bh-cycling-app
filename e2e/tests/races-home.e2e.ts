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
import type { Screen } from 'e2e';

const { name } = planSeed(new Date()).events.race;
const A_RACE_EYEBROW_DRAWN_IN_CAPITALS = /^Wyścig A$/i;

async function expectGoalRaceSheetOpen(screen: Screen): Promise<void> {
  const sheet = screen.getByTestId('race-detail-sheet');

  await expect(sheet.getByText(wholeText(name))).toBeVisible();
  await expect(sheet.getByText(A_RACE_EYEBROW_DRAWN_IN_CAPITALS)).toBeVisible();
  await expect(sheet.getByText(/^Bieg$/)).toBeVisible();
}

test('Home → next-race card and Dziś i jutro open E2E Goal Race', async ({
  screen,
}) => {
  await signIn(screen);

  const card = byComposedLabel(
    screen,
    new RegExp(`^Najbliższy wyścig: Wyścig A, ${name}, jutro\\.`),
  );

  await expect(card).toBeVisible(LOAD_TIMEOUT);
  await card.tap();
  await expectGoalRaceSheetOpen(screen);

  const sheet = screen.getByTestId('race-detail-sheet');

  await sheet.getByLabel(/^Zamknij$/).tap();
  await expect(sheet).toBeHidden();

  const tile = byComposedLabel(screen, new RegExp(`^Wyścig A: ${name}, Bieg$`));

  await screen.scrollUntilVisible(tile);
  await tapClearOfTabBar(screen, tile);
  await expectGoalRaceSheetOpen(screen);
});
