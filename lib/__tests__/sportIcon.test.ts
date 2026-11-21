import { sportIcon, sportLabel } from '../sportIcon';

describe('sportIcon', () => {
  it.each([
    'Ride',
    'VirtualRide',
    'GravelRide',
    'MountainBikeRide',
    'EBikeRide',
    'TrackRide',
  ])('draws a bicycle for %s', type => {
    expect(sportIcon(type)).toBe('bicycle');
  });

  it.each([
    ['Run', 'walk'],
    ['VirtualRun', 'walk'],
    ['TrailRun', 'walk'],
    ['Walk', 'footsteps'],
    ['Hike', 'footsteps'],
    ['Swim', 'water'],
    ['OpenWaterSwim', 'water'],
    ['WeightTraining', 'barbell'],
    ['Rowing', 'boat'],
    ['NordicSki', 'snow'],
    ['Yoga', 'body'],
  ])('draws a matching icon for %s', (type, icon) => {
    expect(sportIcon(type)).toBe(icon);
  });

  it('falls back to a generic icon for a sport it does not know', () => {
    expect(sportIcon('Kitesurf')).toBe('fitness');
  });
});

describe('sportLabel', () => {
  it.each([
    'Ride',
    'VirtualRide',
    'GravelRide',
    'MountainBikeRide',
    'EBikeRide',
    'TrackRide',
    'Velomobile',
    'Handcycle',
  ])('labels %s a ride', type => {
    expect(sportLabel(type)).toBe('sport.ride');
  });

  it.each([
    ['Run', 'sport.run'],
    ['VirtualRun', 'sport.run'],
    ['TrailRun', 'sport.run'],
    ['Walk', 'sport.walk'],
    ['Hike', 'sport.walk'],
    ['Swim', 'sport.swim'],
    ['OpenWaterSwim', 'sport.swim'],
    ['WeightTraining', 'sport.strength'],
    ['Crossfit', 'sport.strength'],
    ['Rowing', 'sport.rowing'],
    ['Kayaking', 'sport.rowing'],
    ['NordicSki', 'sport.winter'],
    ['Snowboard', 'sport.winter'],
    ['Yoga', 'sport.yoga'],
    ['Pilates', 'sport.yoga'],
  ])('labels %s with its sport', (type, label) => {
    expect(sportLabel(type)).toBe(label);
  });

  it('takes the first matching sport, as the icon does', () => {
    const rideAndWinterType = 'SnowRide';

    expect(sportLabel(rideAndWinterType)).toBe('sport.ride');
    expect(sportIcon(rideAndWinterType)).toBe('bicycle');
  });

  it('falls back to a generic label for a sport it does not know', () => {
    expect(sportLabel('Kitesurf')).toBe('sport.other');
  });
});
