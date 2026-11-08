import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('Home → E2E Sweet Spot → Workout Details', async ({ screen }) => {
  const { name } = planSeed(new Date()).events.sweetSpot;
  const title = new RegExp(name);

  await signIn(screen);

  const tile = screen.getByText(title);

  await expect(tile).toBeVisible(LOAD_TIMEOUT);
  await tile.tap();

  await expect(screen.getByTestId('workout-details-profile')).toBeVisible(
    LOAD_TIMEOUT,
  );
  // The Home tile stays in the tree under Workout Details, and its label
  // starts with the name too, so match the details title whole.
  await expect(screen.getByText(new RegExp(`^${name}$`))).toBeVisible();
  await expect(screen.getByText(/Zaplanowany/)).toBeVisible();
});
