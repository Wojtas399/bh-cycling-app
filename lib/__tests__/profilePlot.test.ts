import {
  type ProfileCardInput,
  type RecordedProfile,
  buildProfileCard,
} from '../profileCard';
import { profilePlot } from '../profilePlot';
import { type RideSettings, resolveRideSettings } from '../rideSettings';
import type { WorkoutStep } from '../workoutProfile';
import i18n from '@/i18n';

const t = i18n.getFixedT('pl');

const FTP = 250;

const AT_THE_CURRENT_FTP = resolveRideSettings({ ftp: FTP });

const PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100: WorkoutStep[] = [
  { duration: 600, power: { units: '%ftp', value: 60 } },
  { duration: 600, power: { units: '%ftp', value: 100 } },
];

const RIDE_OF_10_MINUTES_PEAKING_AT_98_PCT: RecordedProfile = {
  intervals: [
    { startSeconds: 0, endSeconds: 150, intensity: 55, zone: 2 },
    { startSeconds: 150, endSeconds: 600, intensity: 98, zone: 4 },
  ],
  endSeconds: 600,
  icuFtp: FTP,
  icuZoneTimes: null,
};

const PLAN_LABEL =
  'Profil treningu: 20m, 2 kroki, maks. 100% FTP. Moc szczytowa 250 W, średnia 200 W';

function plotOf(
  input: ProfileCardInput,
  settings: RideSettings = AT_THE_CURRENT_FTP,
) {
  const card = buildProfileCard(input, settings);

  if (!card) throw new Error('No card to plot.');

  return { card, plot: profilePlot(card, t) };
}

describe('profilePlot', () => {
  it('plots the plan alone, labelled with its steps and power', () => {
    const { card, plot } = plotOf({
      planned: PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100,
    });

    expect(plot).toEqual({
      strips: [{ segments: card.planned?.segments, caption: 'Plan' }],
      accessibilityLabel: PLAN_LABEL,
    });
  });

  it('labels the plan with the length of its timed steps, leaving out a step with only a distance', () => {
    const { plot } = plotOf({
      planned: [
        ...PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100,
        { distance: 5000, power: { units: '%ftp', value: 50 } },
      ],
    });

    expect(plot.accessibilityLabel).toBe(PLAN_LABEL);
  });

  it('plots the plan above the ride, and labels both', () => {
    const { card, plot } = plotOf({
      planned: PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100,
      recorded: RIDE_OF_10_MINUTES_PEAKING_AT_98_PCT,
    });

    expect(plot.strips).toEqual([
      { segments: card.planned?.segments, caption: 'Plan' },
      { segments: card.recorded?.segments, caption: 'Wykonanie' },
    ]);
    expect(plot.accessibilityLabel).toBe(
      `Plan i wykonanie. ${PLAN_LABEL}. Profil aktywności: 10m, 2 odcinki, maks. 98% FTP. Moc szczytowa 245 W, średnia 218 W`,
    );
  });

  it("labels the ride's power in %FTP, the unit of the scale, with no current FTP, even though the ride kept its own", () => {
    const { plot } = plotOf(
      { recorded: RIDE_OF_10_MINUTES_PEAKING_AT_98_PCT },
      resolveRideSettings(null),
    );

    expect(plot.accessibilityLabel).toBe(
      'Profil aktywności: 10m, 2 odcinki, maks. 98% FTP. Moc szczytowa 98% FTP, średnia 87% FTP',
    );
  });

  it('has an empty label for a card with no strip', () => {
    expect(
      profilePlot({ planned: null, recorded: null }, t).accessibilityLabel,
    ).toBe('');
  });
});
