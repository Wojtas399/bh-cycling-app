import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { tapAlertButton } from '../support/locators';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('sign out from Ustawienia → still signed out after a relaunch', async ({
  app,
  screen,
}) => {
  await signIn(screen);

  await screen.getByText(/Ustawienia/).tap();

  const signOutRow = screen.getByText(/Wyloguj się/);

  await screen.scrollUntilVisible(signOutRow);
  await signOutRow.tap();

  await tapAlertButton(screen, 'Wyloguj');

  const emailField = screen.getByPlaceholder(EMAIL_PLACEHOLDER);

  await expect(emailField).toBeVisible(LOAD_TIMEOUT);

  await app.restart();
  await expect(emailField).toBeVisible(LOAD_TIMEOUT);
});
