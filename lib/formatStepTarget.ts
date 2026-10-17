import type { StepSpan, WorkoutDetailsPlainStep } from './workoutSteps';

/**
 * Formats a span: one number when flat, `start–end` for a range and
 * `start→end` for a ramp, so a ramp reads differently from a range.
 */
function formatSpan(span: StepSpan, ramp: boolean): string {
  const start = Math.round(span.start);
  const end = Math.round(span.end);

  if (start === end) return `${start}`;

  return `${start}${ramp ? '→' : '–'}${end}`;
}

/**
 * A Kroki step's target line: `%FTP · W`, plus `rpm` with a cadence target.
 * Parts the step doesn't have are left out; empty when it has none.
 */
export function formatStepTarget(step: WorkoutDetailsPlainStep): string {
  return [
    step.ftpPct && `${formatSpan(step.ftpPct, step.ramp)}% FTP`,
    step.watts && `${formatSpan(step.watts, step.ramp)} W`,
    step.cadenceRpm && `${formatSpan(step.cadenceRpm, step.ramp)} rpm`,
  ]
    .filter(Boolean)
    .join(' · ');
}
