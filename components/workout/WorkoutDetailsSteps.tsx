import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { ZONE_COLORS } from '@/components/WorkoutProfile';
import { formatStepDuration } from '@/lib/formatStepDuration';
import { formatStepTarget } from '@/lib/formatStepTarget';
import type {
  WorkoutDetailsPlainStep,
  WorkoutDetailsRepeat,
  WorkoutDetailsStep,
} from '@/lib/workoutSteps';

export interface WorkoutDetailsStepsProps {
  steps: WorkoutDetailsStep[];
}

/**
 * The Kroki list: every step of the Workout in order, repeats as bordered
 * groups with their steps indented. Read-only; rows aren't interactive.
 */
export default function WorkoutDetailsSteps({
  steps,
}: WorkoutDetailsStepsProps) {
  return (
    <Box>
      {steps.map((step, index) => (
        // Steps have no identity of their own: they are positions in the
        // doc's ordered list, replaced wholesale and never reordered.
        // eslint-disable-next-line react/no-array-index-key
        <StepNode key={index} step={step} />
      ))}
    </Box>
  );
}

function StepNode({ step }: { step: WorkoutDetailsStep }) {
  return step.type === 'repeat' ? (
    <RepeatGroup repeat={step} />
  ) : (
    <StepRow step={step} />
  );
}

function RepeatGroup({ repeat }: { repeat: WorkoutDetailsRepeat }) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.kroki',
  });

  return (
    <Box
      borderWidth={1}
      borderColor="borderDefault"
      borderRadius="md"
      padding="sm"
      marginVertical="xs"
    >
      <Text variant="body-s-medium" color="textSecondary">
        {repeat.durationSeconds === undefined
          ? t('repeat', { reps: repeat.reps })
          : t('repeatWithTotal', {
              reps: repeat.reps,
              total: formatStepDuration(repeat.durationSeconds),
            })}
      </Text>
      <Box paddingLeft="sm">
        {repeat.steps.map((child, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <StepNode key={index} step={child} />
        ))}
      </Box>
    </Box>
  );
}

function StepRow({ step }: { step: WorkoutDetailsPlainStep }) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.kroki',
  });
  const target = formatStepTarget(step);
  const label = step.text ?? t(step.role ?? 'step');

  return (
    <Box flexDirection="row" alignItems="center" paddingVertical="sm">
      <Box
        width={4}
        alignSelf="stretch"
        borderRadius="full"
        marginRight="md"
        backgroundColor={step.zone ? ZONE_COLORS[step.zone] : 'borderStrong'}
      />
      <Box flex={1}>
        <Text variant="body-s-medium">{label}</Text>
        {target !== '' && (
          <Text variant="body-xs-regular" color="textSecondary">
            {target}
          </Text>
        )}
      </Box>
      {step.durationSeconds !== undefined && (
        <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
          {formatStepDuration(step.durationSeconds)}
        </Text>
      )}
    </Box>
  );
}
