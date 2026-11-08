import { athleteFromEnv } from './athlete';
import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from './constants';
import { credentials, expect } from 'e2e';
import type { Screen } from 'e2e';

/** Signs in as the test athlete from the sign-in screen and waits for Home. */
export async function signIn(screen: Screen): Promise<void> {
  const athlete = credentials.user('athlete');

  const passwordField = screen.getByPlaceholder('••••••••');

  await screen.getByPlaceholder(EMAIL_PLACEHOLDER).fill(athlete.username);
  // tester-army/e2e#1631: on iOS, typing into a secure text field fails with
  // "No focused text input" unless the field was tapped first, and `fill`
  // fails either way. So tap, then type the password as a plain string,
  // which means it must never reach an agent step. Once #1631 is fixed,
  // switch to `passwordField.fill(athlete.password)`, which the runner
  // treats as a secret.
  await passwordField.tap();
  await passwordField.pressSequentially(athleteFromEnv().password);
  // "Zaloguj się" is both the screen title and the button; the button is last.
  await screen
    .getByText(/^Zaloguj się$/)
    .last()
    .tap();
  await expect(screen.getByText(/Dziś i jutro/)).toBeVisible(LOAD_TIMEOUT);
}
