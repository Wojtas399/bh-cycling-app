import Box from '@/components/Box';
import HealthDataConsentPrompt from '@/components/HealthDataConsentPrompt';
import FitnessCard from '@/components/home/FitnessCard';
import WellnessCard from '@/components/home/WellnessCard';
import type { TodayCardsState } from '@/hooks/home/useTodayCards';

export default function TodayCards({ state }: { state: TodayCardsState }) {
  switch (state.status) {
    case 'hidden':
      return null;
    case 'needsScope':
      return <HealthDataConsentPrompt prompt={state.prompt} />;
    default:
      return (
        <Box gap="md">
          <FitnessCard state={state} />
          <WellnessCard state={state} />
        </Box>
      );
  }
}
