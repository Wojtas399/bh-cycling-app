import { test } from '../support/fixtures';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('sign in → Home shows Dziś i jutro', async ({ screen }) => {
  await signIn(screen);

  await expect(screen.getByText(/Dziś i jutro/)).toBeVisible();
});
