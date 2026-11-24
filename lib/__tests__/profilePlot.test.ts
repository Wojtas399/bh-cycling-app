import {
  type ProfileCardInput,
  type RecordedProfile,
  buildProfileCard,
} from '../profileCard';
import {
  Y_LABEL_GUTTER_PX,
  profilePlot,
  segmentPixels,
  stackXOf,
} from '../profilePlot';
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

function rideOf(
  intervals: [startSeconds: number, endSeconds: number][],
  endSeconds: number,
): RecordedProfile {
  return {
    intervals: intervals.map(([startSeconds, intervalEnd]) => ({
      startSeconds,
      endSeconds: intervalEnd,
      intensity: 90,
      zone: 3,
    })),
    endSeconds,
    icuFtp: FTP,
    icuZoneTimes: null,
  };
}

function pixelsOf(ride: RecordedProfile, plotWidth: number) {
  const card = buildProfileCard({ recorded: ride }, AT_THE_CURRENT_FTP);

  if (!card?.recorded) throw new Error('No ride to plot.');

  return card.recorded.segments.map(segment =>
    segmentPixels(segment, card.durationSeconds, plotWidth),
  );
}

describe('segmentPixels', () => {
  it('places a segment at its seconds in proportion to the plot width', () => {
    expect(pixelsOf(rideOf([[120, 126]], 600), 300)).toEqual([
      { x: 60, width: 3 },
    ]);
  });

  it('keeps a 1 px hairline inside each edge of a bar wider than 4 px, so repeats stay countable', () => {
    expect(
      pixelsOf(
        rideOf(
          [
            [0, 150],
            [150, 600],
          ],
          600,
        ),
        300,
      ),
    ).toEqual([
      { x: 1, width: 73 },
      { x: 76, width: 223 },
    ]);
  });

  it('draws a segment narrower than 2 px 2 px wide, centred on its real time, even over its neighbour', () => {
    expect(
      pixelsOf(
        rideOf(
          [
            [300, 303],
            [303, 306],
          ],
          600,
        ),
        300,
      ),
    ).toEqual([
      { x: 149.75, width: 2 },
      { x: 151.25, width: 2 },
    ]);
  });

  it('draws nothing on a plot of zero width', () => {
    expect(
      pixelsOf(
        rideOf(
          [
            [0, 3],
            [3, 600],
          ],
          600,
        ),
        0,
      ),
    ).toEqual([
      { x: 0, width: 0 },
      { x: 0, width: 0 },
    ]);
  });
});

describe('stackXOf', () => {
  it('starts the plot right of the label gutter', () => {
    expect(stackXOf(0)).toBe(Y_LABEL_GUTTER_PX);
  });

  it('keeps a point its distance into the plot', () => {
    expect(stackXOf(150)).toBe(Y_LABEL_GUTTER_PX + 150);
  });
});
