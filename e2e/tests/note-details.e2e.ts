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
