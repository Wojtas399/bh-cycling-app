import type { ActivityDetails } from '../activityDetails';
import { buildDetailedProfile } from '../detailedProfile';
import type { NO_WORKOUT_PROFILE } from '../profileCard';
import { buildProfileCard } from '../profileCard';
import { profilePlot } from '../profilePlot';
import { resolveRideSettings } from '../rideSettings';
import { NO_ZONE_TIMES } from '../timeInZone';
import i18n from '@/i18n';

const t = i18n.getFixedT('pl');

const FTP = 250;

const PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100 = {
  blocks: [
    { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 as const },
    { widthFraction: 0.5, minPct: 100, maxPct: 100, zone: 4 as const },
  ],
  profileSummary: { durationSeconds: 1200, stepCount: 2, peakFtpPct: 100 },
  zoneTimes: NO_ZONE_TIMES,
};

const RIDE_OF_10_MINUTES_PEAKING_AT_98_PCT: ActivityDetails = {
  isStravaActivity: false,
  title: 'Popołudniowa jazda',
  type: 'Ride',
  startLocal: '2026-10-23T16:42:00',
  blocks: [
    { widthFraction: 0.25, minPct: 55, maxPct: 55, zone: 2 },
    { widthFraction: 0.75, minPct: 98, maxPct: 98, zone: 4 },
  ],
  profileSummary: {
    durationSeconds: 600,
    segmentCount: 2,
    peakFtpPct: 98,
  },
  icuFtp: FTP,
  zoneTimes: null,
  metrics: [],
  route: null,
  pairedEventId: null,
};

const PLAN_LABEL =
  'Profil treningu: 20m, 2 kroki, maks. 100% FTP. Moc szczytowa 250 W, średnia 200 W';

function plotOf(
  workout:
    | typeof PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100
    | typeof NO_WORKOUT_PROFILE,
  activity: ActivityDetails | undefined,
) {
  const card = buildProfileCard(workout, activity, FTP);

  if (!card) throw new Error('No card to plot.');

  const profile = buildDetailedProfile(card, resolveRideSettings({ ftp: FTP }));

  return { profile, plot: profilePlot(profile, t) };
}

describe('profilePlot', () => {
  it('plots the plan alone, labelled with its steps and power', () => {
    const { profile, plot } = plotOf(
      PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100,
      undefined,
    );

    expect(plot).toEqual({
      strips: [{ segments: profile.planned?.segments, caption: 'Plan' }],
      accessibilityLabel: PLAN_LABEL,
    });
  });

  it('plots the plan above the ride, and labels both', () => {
    const { profile, plot } = plotOf(
      PLAN_OF_10_MINUTES_AT_60_PCT_THEN_10_AT_100,
      RIDE_OF_10_MINUTES_PEAKING_AT_98_PCT,
    );

    expect(plot.strips).toEqual([
      { segments: profile.planned?.segments, caption: 'Plan' },
      { segments: profile.recorded?.segments, caption: 'Wykonanie' },
    ]);
    expect(plot.accessibilityLabel).toBe(
      `Plan i wykonanie. ${PLAN_LABEL}. Profil aktywności: 10m, 2 odcinki, maks. 98% FTP. Moc szczytowa 245 W, średnia 218 W`,
    );
  });

  it('has an empty label for a card with no strip', () => {
    expect(
      profilePlot({ planned: null, recorded: null }, t).accessibilityLabel,
    ).toBe('');
  });
});
