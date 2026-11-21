import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { byComposedLabel } from '../support/locators';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

const { name } = planSeed(new Date()).ride;
const WATTS_AXIS_PROFILE_LABEL =
  /^Profil aktywności: .*Moc szczytowa \d+ W, średnia \d+ W$/;
const WATTS_READING = /^Z\d · \d+% · \d+ W$/;

test('Home → E2E Ride → scrub the Activity Profile and hide the readout', async ({
  screen,
}) => {
  await signIn(screen);

  const tile = screen.getByText(new RegExp(name));

  await screen.scrollUntilVisible(tile, LOAD_TIMEOUT);
  await tile.tap();

  const card = screen.getByTestId('activity-details-profile');

  await expect(card).toBeVisible(LOAD_TIMEOUT);
  await expect(byComposedLabel(screen, WATTS_AXIS_PROFILE_LABEL)).toBeVisible();
  await expect(screen.getByLabel(/^Strefa 1: /)).toBeVisible();

  const box = await card.boundingBox();

  if (!box) throw new Error('The profile card has no bounds.');

  const yAcrossThePlot = box.y + box.height * 0.4;

  await screen.swipe({
    from: { x: box.x + box.width * 0.3, y: yAcrossThePlot },
    to: { x: box.x + box.width * 0.7, y: yAcrossThePlot },
    duration: 600,
  });

  const readout = screen.getByTestId('activity-details-profile-readout');
  const reading = screen.getByText(WATTS_READING);

  await expect(readout).toBeVisible();
  await expect(reading).toBeVisible();

  await screen.getByLabel(/^Ukryj$/).tap();
  await expect(readout).toBeHidden();
  await expect(reading).toBeHidden();
});
