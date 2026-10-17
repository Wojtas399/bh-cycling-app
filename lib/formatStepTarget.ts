import type { StepSpan, WorkoutDetailsPlainStep } from './workoutSteps';

/**
 * Formats a span: one number when flat, else `start–end`. A ramp reads the
 * same way as a range, in the order it is ridden.
 */
function formatSpan(span: StepSpan): string {
  const start = Math.round(span.start);
  const end = Math.round(span.end);

  if (start === end) return `${start}`;

  return `${start}–${end}`;
}

/**
 * A Kroki step's target line: `%FTP · W`, plus `rpm` with a cadence target.
 * Parts the step doesn't have are left out; empty when it has none.
 */
export function formatStepTarget(step: WorkoutDetailsPlainStep): string {
  return [
    step.ftpPct && `${formatSpan(step.ftpPct)}% FTP`,
    step.watts && `${formatSpan(step.watts)} W`,
    step.cadenceRpm && `${formatSpan(step.cadenceRpm)} rpm`,
  ]
    .filter(Boolean)
    .join(' · ');
}
