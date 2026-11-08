import { athleteFromEnv } from './athlete';
import { credentials, expect } from 'e2e';
import type { Screen } from 'e2e';

/** Signs in as the test athlete from the sign-in screen and waits for Home. */
export async function signIn(screen: Screen): Promise<void> {
  const athlete = credentials.user('athlete');

  await screen.getByPlaceholder('you@example.com').fill(athlete.username);
  // tester-army/e2e#1631: on iOS, `fill` into a secure text field fails with
  // "No focused text input", so the password is typed as a plain string.
  // Once it's fixed, switch to `.fill(athlete.password)`, which the runner
  // treats as a secret. Never pass this plain password to an agent step.
  await screen
    .getByPlaceholder('••••••••')
    .pressSequentially(athleteFromEnv().password);
  // "Zaloguj się" is both the screen title and the button; the button is last.
  await screen
    .getByText(/^Zaloguj się$/)
    .last()
    .tap();
  await expect(screen.getByText(/Dziś i jutro/)).toBeVisible({
    timeout: 30_000,
  });
}
