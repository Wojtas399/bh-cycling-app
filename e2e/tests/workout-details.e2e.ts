import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('Home → E2E Sweet Spot → Workout Details', async ({ screen }) => {
  const title = new RegExp(planSeed(new Date()).events.sweetSpot.name);

  await signIn(screen);

  const tile = screen.getByText(title);

  await expect(tile).toBeVisible({ timeout: 30_000 });
  await tile.tap();

  await expect(screen.getByTestId('workout-details-profile')).toBeVisible({
    timeout: 30_000,
  });
  await expect(screen.getByText(title)).toBeVisible();
  await expect(screen.getByText(/Zaplanowany/)).toBeVisible();
});
