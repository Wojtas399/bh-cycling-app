import Box from '@/components/Box';
import WellnessScopePrompt from '@/components/WellnessScopePrompt';
import FitnessCard from '@/components/home/FitnessCard';
import WellnessCard from '@/components/home/WellnessCard';
import type { TodayCardsState } from '@/hooks/home/useTodayCards';

/**
 * Home's top cards: Fitness, then Wellness. They share one read, so they load
 * and hide together, and a missing Wellness scope shows one prompt in their
 * place.
 */
export default function TodayCards({ state }: { state: TodayCardsState }) {
  switch (state.status) {
    case 'hidden':
      return null;
    case 'needsScope':
      return (
        <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
          <WellnessScopePrompt />
        </Box>
      );
    default:
      return (
        <Box gap="md">
          <FitnessCard state={state} />
          <WellnessCard state={state} />
        </Box>
      );
  }
}
