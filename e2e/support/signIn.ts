import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from './constants';
import { dismissSavePasswordSheet, tapKeyboardDone } from './locators';
import { credentials, expect } from 'e2e';
import type { Locator, Screen } from 'e2e';

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
  await tapKeyboardDone(passwordField);
  await dismissSavePasswordSheet(screen, landing);

  await expect(landing).toBeVisible(LOAD_TIMEOUT);
}
