import type { ActivityDetails } from '../activityDetails';
import { buildDetailedProfile } from '../detailedProfile';
import type { PowerStream } from '../powerStream';
import { NO_WORKOUT_PROFILE, buildProfileCard } from '../profileCard';
import { profilePlot } from '../profilePlot';
import { resolveRideSettings } from '../rideSettings';
import { NO_ZONE_TIMES } from '../timeInZone';
import i18n from '@/i18n';

const t = i18n.getFixedT('pl');

const FTP = 250;

/** 20 minutes: 10 at 60% FTP, then 10 at 100%. */
const PLAN = {
  blocks: [
    { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 as const },
    { widthFraction: 0.5, minPct: 100, maxPct: 100, zone: 4 as const },
  ],
  profileSummary: { durationSeconds: 1200, stepCount: 2, peakFtpPct: 100 },
  zoneTimes: NO_ZONE_TIMES,
};

/** 10 minutes whose intervals peak at 98% FTP. */
const RIDE: ActivityDetails = {
  isStravaActivity: false,
  title: 'Popołudniowa jazda',
  type: 'Ride',
  startLocal: '2026-10-23T16:42:00',
  blocks: [
    { widthFraction: 0.25, minPct: 55, maxPct: 55, zone: 2 },
    { widthFraction: 0.75, minPct: 98, maxPct: 98, zone: 4 },
  ],
  profileSummary: {
    startSeconds: 0,
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

/** The ride's power stream: 10 minutes at 200 W, 80% FTP. */
const STREAM: PowerStream = {
  time: Array.from({ length: 600 }, (_, i) => i),
  watts: Array.from({ length: 600 }, () => 200),
};

const PLAN_LABEL =
  'Profil treningu: 20m, 2 kroki, maks. 100% FTP. Moc szczytowa 250 W, średnia 200 W';

function plotOf(
  workout: typeof PLAN | typeof NO_WORKOUT_PROFILE,
  activity: ActivityDetails | undefined,
  stream: PowerStream | null = null,
) {
  const card = buildProfileCard(workout, activity, FTP, stream);

  if (!card) throw new Error('No card to plot.');

  const profile = buildDetailedProfile(
    card,
    resolveRideSettings({ ftp: FTP }),
    300,
  );

  return { profile, plot: profilePlot(profile, t) };
}

describe('profilePlot', () => {
  it('plots the plan alone, labelled with its steps and power', () => {
    const { profile, plot } = plotOf(PLAN, undefined);

    expect(plot).toEqual({
      strips: [{ segments: profile.planned?.segments, caption: 'Plan' }],
      accessibilityLabel: PLAN_LABEL,
    });
  });

  it('plots the plan above the ride, and labels both', () => {
    const { profile, plot } = plotOf(PLAN, RIDE);

    expect(plot.strips).toEqual([
      { segments: profile.planned?.segments, caption: 'Plan' },
      { segments: profile.recorded?.segments, caption: 'Wykonanie' },
    ]);
    expect(plot.accessibilityLabel).toBe(
      `Plan i wykonanie. ${PLAN_LABEL}. Profil aktywności: 10m, 2 odcinki, maks. 98% FTP. Moc szczytowa 245 W, średnia 218 W`,
    );
  });

  it('reads the peak of a ride drawn from its stream from the stream, not its intervals', () => {
    const { plot } = plotOf(NO_WORKOUT_PROFILE, RIDE, STREAM);

    expect(plot.accessibilityLabel).toBe(
      'Profil aktywności: 10m, 2 odcinki, maks. 80% FTP. Moc szczytowa 200 W, średnia 200 W',
    );
  });
});
