// PROTOTYPE — throwaway. Floating bottom bar for cycling through UI
// prototype variants via the `?variant=` route param. Gated on `__DEV__` by
// the caller — never mount this in a production build.
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';

export interface PrototypeVariant {
  key: string;
  label: string;
}

export function usePrototypeVariant(variants: PrototypeVariant[]): string {
  const params = useLocalSearchParams<{ variant?: string }>();
  const requested = Array.isArray(params.variant)
    ? params.variant[0]
    : params.variant;

  return variants.some(v => v.key === requested) ? requested! : variants[0].key;
}

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: PrototypeVariant[];
  current: string;
}) {
  const router = useRouter();
  const currentIndex = variants.findIndex(v => v.key === current);
  const currentVariant = variants[currentIndex];

  const go = (delta: number) => {
    const nextIndex =
      (currentIndex + delta + variants.length) % variants.length;

    router.setParams({ variant: variants[nextIndex].key });
  };

  return (
    <Box
      position="absolute"
      bottom={24}
      alignSelf="center"
      flexDirection="row"
      alignItems="center"
      backgroundColor="bgTertiary"
      borderRadius="full"
      paddingHorizontal="base"
      paddingVertical="sm"
      style={{
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 8,
      }}
    >
      <Pressable onPress={() => go(-1)} hitSlop={12}>
        <Text variant="body-l-semibold">‹</Text>
      </Pressable>
      <Text variant="body-s-medium">
        {currentVariant.key} — {currentVariant.label}
      </Text>
      <Pressable onPress={() => go(1)} hitSlop={12}>
        <Text variant="body-l-semibold">›</Text>
      </Pressable>
    </Box>
  );
}
