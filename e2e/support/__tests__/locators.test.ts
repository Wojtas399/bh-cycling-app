import { weekRowLabel, wholeText } from '../locators';

jest.mock('e2e', () => ({}));

describe('weekRowLabel', () => {
  it.each([
    ['planned', 'Trening zaplanowany, E2E Sweet Spot, 1 godz.'],
    ['completed', 'Trening wykonany, E2E Sweet Spot, 1 godz., obciążenie 52'],
    ['missed', 'Trening pominięty, E2E Sweet Spot'],
  ] as const)(
    'matches a %s Workout row by its composed label, Workout Status first',
    (status, label) => {
      expect(label).toMatch(weekRowLabel({ status, name: 'E2E Sweet Spot' }));
      expect(label).toMatch(
        weekRowLabel({ status: 'any', name: 'E2E Sweet Spot' }),
      );
    },
  );

  it('leaves out a row whose name only starts with the Workout name', () => {
    expect('Trening zaplanowany, E2E Sweet Spot 2, 1 godz.').not.toMatch(
      weekRowLabel({ status: 'any', name: 'E2E Sweet Spot' }),
    );
  });

  it('leaves out a row with another Workout Status', () => {
    expect('Trening wykonany, E2E Sweet Spot, 1 godz.').not.toMatch(
      weekRowLabel({ status: 'planned', name: 'E2E Sweet Spot' }),
    );
  });
});

describe('wholeText', () => {
  it('matches the text whole, so the screen under a pushed screen, whose label only starts with it, is left out', () => {
    expect('E2E Sweet Spot').toMatch(wholeText('E2E Sweet Spot'));
    expect('E2E Sweet Spot, 1 godz.').not.toMatch(wholeText('E2E Sweet Spot'));
  });
});
