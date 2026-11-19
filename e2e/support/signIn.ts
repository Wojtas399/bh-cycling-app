import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from './constants';
import { credentials, expect } from 'e2e';
import type { Locator, Screen } from 'e2e';

/**
 * Signs in from the sign-in screen and waits for `landing`. By default that's
 * the test athlete landing on Home.
 */
export async function signIn(
  screen: Screen,
  {
    user = 'athlete',
    landing = screen.getByText(/Dziś i jutro/),
  }: { user?: 'athlete' | 'unverified'; landing?: Locator } = {},
): Promise<void> {
  const account = credentials.user(user);

  const passwordField = screen.getByPlaceholder('••••••••');

  await screen.getByPlaceholder(EMAIL_PLACEHOLDER).fill(account.username);
  await passwordField.fill(account.password);
  // Submit with the keyboard's Done key, which runs the form's submit. On
  // iOS the keyboard covers the "Zaloguj się" button, so a locator finds
  // only the screen title, and tapping that just closes the keyboard.
  await passwordField.press('Enter');

  // iOS may offer to save the password in a system sheet over the app, in
  // Polish on the local simulator and English on Expo Simulators.
  const notNow = screen.getByText(/^(Nie teraz|Not Now)$/);

  await expect(landing.or(notNow)).toBeVisible(LOAD_TIMEOUT);

  // The sheet can arrive seconds after Home shows, and it then covers
  // whatever the test does next. Give it a grace period before moving on.
  if (!(await notNow.isVisible())) {
    await notNow.waitFor({ timeout: SAVE_SHEET_GRACE_MS }).catch(() => {});
  }

  if (await notNow.isVisible()) await notNow.tap();

  await expect(landing).toBeVisible(LOAD_TIMEOUT);
}

/** How long iOS gets to show its save-password sheet after Home appears. */
const SAVE_SHEET_GRACE_MS = 5_000;
