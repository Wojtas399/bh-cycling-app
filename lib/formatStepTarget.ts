import type { StepSpan } from './powerTarget';
import type { WorkoutDetailsPlainStep } from './workoutSteps';

function formatSpan(span: StepSpan): string {
  const start = Math.round(span.start);
  const end = Math.round(span.end);

  if (start === end) return `${start}`;

  return `${start}–${end}`;
}

export function formatStepTarget(step: WorkoutDetailsPlainStep): string {
  return [
    step.ftpPct && `${formatSpan(step.ftpPct)}% FTP`,
    step.watts && `${formatSpan(step.watts)} W`,
    step.cadenceRpm && `${formatSpan(step.cadenceRpm)} rpm`,
  ]
    .filter(Boolean)
    .join(' · ');
}
