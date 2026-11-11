import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';
import type { Screen } from 'e2e';

const { name } = planSeed(new Date()).events.race;

/** The open Race Detail Sheet shows E2E Goal Race, an A Race run. */
async function expectRaceSheet(screen: Screen): Promise<void> {
  const sheet = screen.getByTestId('race-detail-sheet');

  await expect(sheet.getByText(new RegExp(`^${name}$`))).toBeVisible();
  // `/i` because the A Race's eyebrow is drawn in capitals.
  await expect(sheet.getByText(/^Wyścig A$/i)).toBeVisible();
  await expect(sheet.getByText(/^Bieg$/)).toBeVisible();
}

test('Home → next-race card and Dziś i jutro open E2E Goal Race', async ({
  screen,
}) => {
  await signIn(screen);

  // The card and the tile are each one button read by its own label, so iOS
  // hides the visible "Jutro" and name inside them.
  const card = screen.getByLabel(
    new RegExp(`^Najbliższy wyścig: Wyścig A, ${name}, jutro\\.`),
  );

  await expect(card).toBeVisible(LOAD_TIMEOUT);
  await card.tap();
  await expectRaceSheet(screen);

  const sheet = screen.getByTestId('race-detail-sheet');

  await sheet.getByLabel(/^Zamknij$/).tap();
  await expect(sheet).toBeHidden();

  const tile = screen.getByLabel(new RegExp(`^Wyścig A: ${name}, Bieg$`));

  await screen.scrollUntilVisible(tile);
  // The tile can stop under the tab bar, the last of "Dziś i jutro" below
  // E2E Ride, so swipe it clear before tapping.
  await screen.swipe({ direction: 'down' });
  await tile.tap();
  await expectRaceSheet(screen);
});
