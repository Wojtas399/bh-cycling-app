import { LOAD_TIMEOUT } from '../support/constants';
import { test } from '../support/fixtures';
import { planSeed } from '../support/seedPlan';
import { signIn } from '../support/signIn';
import { expect } from 'e2e';

const { name } = planSeed(new Date()).ride;

test('Home → E2E Ride → scrub the Activity Profile and hide the readout', async ({
  screen,
}) => {
  await signIn(screen);

  const tile = screen.getByText(new RegExp(name));

  await screen.scrollUntilVisible(tile, LOAD_TIMEOUT);
  await tile.tap();

  const card = screen.getByTestId('activity-details-profile');

  await expect(card).toBeVisible(LOAD_TIMEOUT);
  // The card is one image to the accessibility tree, so its axis labels
  // aren't nodes. Its label reads the ride's power in W, which the card
  // draws on a watts axis.
  await expect(
    screen.getByLabel(
      /^Profil aktywności: .*Moc szczytowa \d+ W, średnia \d+ W$/,
    ),
  ).toBeVisible();
  await expect(screen.getByLabel(/^Strefa 1: /)).toBeVisible();

  const box = await card.boundingBox();

  if (!box) throw new Error('The profile card has no bounds.');

  // Sideways across the plot, which fills the card above its time axis.
  const y = box.y + box.height * 0.4;

  await screen.swipe({
    from: { x: box.x + box.width * 0.3, y },
    to: { x: box.x + box.width * 0.7, y },
    duration: 600,
  });

  // The pointer stays after the finger lifts. On iOS the readout's rows sit
  // beside its node, not inside it, so they're found on the screen. W shows
  // only on a watts card.
  const readout = screen.getByTestId('activity-details-profile-readout');
  const reading = screen.getByText(/^Z\d · \d+% · \d+ W$/);

  await expect(readout).toBeVisible();
  await expect(reading).toBeVisible();

  await screen.getByLabel(/^Ukryj$/).tap();
  await expect(readout).toBeHidden();
  await expect(reading).toBeHidden();
});
