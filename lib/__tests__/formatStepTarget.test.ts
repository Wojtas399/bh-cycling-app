import { formatStepTarget } from '../formatStepTarget';
import type { WorkoutDetailsPlainStep } from '../workoutSteps';

function step(
  overrides: Partial<WorkoutDetailsPlainStep>,
): WorkoutDetailsPlainStep {
  return { type: 'step', ramp: false, ...overrides };
}

describe('formatStepTarget', () => {
  it('reads a single value as %FTP · W', () => {
    expect(
      formatStepTarget(
        step({
          ftpPct: { start: 105, end: 105 },
          watts: { start: 263, end: 263 },
        }),
      ),
    ).toBe('105% FTP · 263 W');
  });

  it('reads a range with a dash and adds the cadence target', () => {
    expect(
      formatStepTarget(
        step({
          ftpPct: { start: 55, end: 75 },
          watts: { start: 162, end: 217 },
          cadenceRpm: { start: 90, end: 100 },
        }),
      ),
    ).toBe('55–75% FTP · 162–217 W · 90–100 rpm');
  });

  it('reads a ramp as start–end, in the order it is ridden', () => {
    expect(
      formatStepTarget(step({ ramp: true, ftpPct: { start: 75, end: 45 } })),
    ).toBe('75–45% FTP');
  });

  it('rounds to whole numbers', () => {
    expect(
      formatStepTarget(
        step({
          ftpPct: { start: 87.6, end: 87.6 },
          watts: { start: 219.4, end: 219.4 },
        }),
      ),
    ).toBe('88% FTP · 219 W');
  });

  it('is empty when the step has no target', () => {
    expect(formatStepTarget(step({}))).toBe('');
  });
});
