import { sportIcon } from '../sportIcon';

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
