import pl from '../../i18n/locales/pl';
import { LOAD_TIMEOUT } from './constants';
import { expect } from 'e2e';
import type { Locator, Screen } from 'e2e';

type WorkoutStatus = keyof typeof pl.calendar.week.workout;

const SAVE_PASSWORD_NOT_NOW = /^(Nie teraz|Not Now)$/;

export function byComposedLabel(
  scope: Pick<Screen, 'getByLabel'>,
  label: RegExp,
): Locator {
  return scope.getByLabel(label);
}

export function weekRowLabel({
  status,
  name,
}: {
  status: WorkoutStatus | 'any';
  name: string;
}): RegExp {
  const statusWords =
    status === 'any'
      ? `(${Object.values(pl.calendar.week.workout).join('|')})`
      : pl.calendar.week.workout[status];

  return new RegExp(`^${statusWords}, ${name}(,|$)`);
}

export function wholeText(text: string): RegExp {
  return new RegExp(`^${text}$`);
}

export async function tapClearOfTabBar(
  screen: Screen,
  target: Locator,
): Promise<void> {
  await screen.swipe({ direction: 'down' });
  await target.tap();
}

export async function tapKeyboardDone(field: Locator): Promise<void> {
  await field.press('Enter');
}

export async function dismissSavePasswordSheet(
  screen: Screen,
  landing: Locator,
): Promise<void> {
  const notNow = screen.getByText(SAVE_PASSWORD_NOT_NOW);

  await expect(landing.or(notNow)).toBeVisible(LOAD_TIMEOUT);

  if (await notNow.isVisible()) await notNow.tap();
}

export async function tapAlertButton(
  screen: Screen,
  buttonText: string,
): Promise<void> {
  await screen.getByText(new RegExp(`^${buttonText}$`, 'i')).tap();
}
