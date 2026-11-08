import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('sign out from Ustawienia → still signed out after a relaunch', async ({
  app,
  screen,
}) => {
  await signIn(screen);

  await screen.getByText(/Ustawienia/).tap();

  const signOutRow = screen.getByText(/Wyloguj się/);

  // The row is the last one in a scroll view; on a short screen it starts
  // below the fold.
  await screen.scrollUntilVisible(signOutRow);
  await signOutRow.tap();

  // React Native's `Alert` is the platform's own dialog inside the app, and
  // agent-device is expected to list its buttons in the tree on both
  // platforms, so a locator should reach "Wyloguj". That isn't yet confirmed
  // on a device. `device.alert('accept')` isn't used because on
  // iOS it only matches English labels like "OK" and "Allow". `/i` because
  // Android's dialog may report the button in capitals. If a platform's run
  // can't find it, swap this line for
  // `await agent.act('Tap "Wyloguj" in the alert')`.
  await screen.getByText(/^Wyloguj$/i).tap();

  const emailField = screen.getByPlaceholder(EMAIL_PLACEHOLDER);

  await expect(emailField).toBeVisible(LOAD_TIMEOUT);

  // The root route stays blank until Firebase restores the session, so the
  // sign-in screen only shows once it has found none.
  await app.restart();
  await expect(emailField).toBeVisible(LOAD_TIMEOUT);
});
