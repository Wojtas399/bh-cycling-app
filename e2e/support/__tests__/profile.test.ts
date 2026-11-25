import { pointOnProfilePlot } from '../profile';

jest.mock('e2e', () => ({}));

describe('pointOnProfilePlot', () => {
  const card = { x: 16, y: 300, width: 344, height: 170 };

  it('puts a share of the plot right of the 44 pt power labels, so 25% of the plot is 25% of the time', () => {
    expect(pointOnProfilePlot(card, 0.25).x).toBe(135);
  });

  it('runs from the plot start at 0 to the card edge at 1', () => {
    expect(pointOnProfilePlot(card, 0).x).toBe(60);
    expect(pointOnProfilePlot(card, 1).x).toBe(360);
  });

  it('stays across the strips, above the time labels under them', () => {
    expect(pointOnProfilePlot(card, 0.6).y).toBe(368);
  });
});
