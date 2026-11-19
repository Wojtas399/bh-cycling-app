import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

test('sign in → Home shows Dziś i jutro', async ({ screen }) => {
  await signIn(screen);

  await expect(screen.getByText(/Dziś i jutro/)).toBeVisible();
});

test('signed in → still on Home after a relaunch', async ({ app, screen }) => {
  await signIn(screen);

  // The root route stays blank until Firebase restores the session, then the
  // auth gate opens Home without the sign-in screen.
  await app.restart();

  await expect(screen.getByText(/Dziś i jutro/)).toBeVisible(LOAD_TIMEOUT);
  await expect(screen.getByPlaceholder(EMAIL_PLACEHOLDER)).toBeHidden();
});

test('unverified → verify-email with Resend on cooldown, ready after a relaunch', async ({
  app,
  screen,
}) => {
  const title = screen.getByText(/^Zweryfikuj adres e-mail$/);

  await signIn(screen, { user: 'unverified', landing: title });

  // Signing in with an unverified email sends the verification email, so
  // Resend counts down, e.g. "Wyślij ponownie (59s)".
  await expect(screen.getByText(/^Wyślij ponownie \(\d+s\)$/)).toBeVisible();

  // A cold start sends nothing, so Resend is ready straight away.
  await app.restart();

  await expect(title).toBeVisible(LOAD_TIMEOUT);
  await expect(screen.getByText(/^Wyślij ponownie$/)).toBeVisible();
  await expect(screen.getByPlaceholder(EMAIL_PLACEHOLDER)).toBeHidden();
});
