import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from './constants';
import { credentials, expect } from 'e2e';
import type { Screen } from 'e2e';

/** Signs in as the test athlete from the sign-in screen and waits for Home. */
export async function signIn(screen: Screen): Promise<void> {
  const athlete = credentials.user('athlete');

  const passwordField = screen.getByPlaceholder('••••••••');

  await screen.getByPlaceholder(EMAIL_PLACEHOLDER).fill(athlete.username);
  await passwordField.fill(athlete.password);
  // Submit with the keyboard's Done key, which runs the form's submit. On
  // iOS the keyboard covers the "Zaloguj się" button, so a locator finds
  // only the screen title, and tapping that just closes the keyboard.
  await passwordField.press('Enter');

  // iOS may offer to save the password in a system sheet over the app, in
  // Polish on the local simulator and English on Expo Simulators.
  const home = screen.getByText(/Dziś i jutro/);
  const notNow = screen.getByText(/^(Nie teraz|Not Now)$/);

  await expect(home.or(notNow)).toBeVisible(LOAD_TIMEOUT);

  if (await notNow.isVisible()) await notNow.tap();

  await expect(home).toBeVisible(LOAD_TIMEOUT);
}
