import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { wholeText } from '../support/locators';
import { scrubProfile } from '../support/profile';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

const PLOT_SHARE_BEFORE_THE_HEART_RATE_STEP = 0.1;
const PLOT_SHARE_INSIDE_THE_HEART_RATE_STEP = 0.25;
const PLOT_SHARE_INSIDE_THE_SWEET_SPOT = 0.6;
const NOTHING_PLANNED_AT_POINTER = /^—$/;
const WATTS_READING = /^Z\d · \d+(–\d+)?% · \d+(–\d+)? W$/;

test('Home → E2E Sweet Spot → Workout Details → scrub the planned steps at their real time', async ({
  screen,
}) => {
  const { name } = planSeed(new Date()).events.sweetSpot;
  const title = new RegExp(name);

  await signIn(screen);

  const tile = screen.getByText(title);

  await expect(tile).toBeVisible(LOAD_TIMEOUT);
  await tile.tap();

  const card = screen.getByTestId('workout-details-profile');

  await expect(card).toBeVisible(LOAD_TIMEOUT);
  await expect(screen.getByText(wholeText(name))).toBeVisible();
  await expect(screen.getByText(/Zaplanowany/)).toBeVisible();

  await scrubProfile(screen, card, {
    from: PLOT_SHARE_BEFORE_THE_HEART_RATE_STEP,
    to: PLOT_SHARE_INSIDE_THE_HEART_RATE_STEP,
  });

  const readout = screen.getByTestId('workout-details-profile-readout');
  const nothingPlanned = screen.getByText(NOTHING_PLANNED_AT_POINTER);
  const reading = screen.getByText(WATTS_READING);

  await expect(readout).toBeVisible();
  await expect(nothingPlanned).toBeVisible();

  await scrubProfile(screen, card, {
    from: PLOT_SHARE_INSIDE_THE_HEART_RATE_STEP,
    to: PLOT_SHARE_INSIDE_THE_SWEET_SPOT,
  });

  await expect(reading).toBeVisible();

  await screen.getByLabel(/^Ukryj$/).tap();
  await expect(readout).toBeHidden();
  await expect(reading).toBeHidden();
});
