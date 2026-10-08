import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  title: string;
  backDisabled?: boolean;
}

const SIDE_SLOT_WIDTH = 44;

export default function ScreenHeader({
  title,
  backDisabled,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      paddingHorizontal="sm"
      paddingBottom="sm"
      style={{ paddingTop: insets.top + theme.spacing.sm }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        accessibilityState={{ disabled: backDisabled }}
        disabled={backDisabled}
        onPress={() => router.back()}
        hitSlop={8}
        style={{
          width: SIDE_SLOT_WIDTH,
          height: SIDE_SLOT_WIDTH,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: backDisabled ? 0.4 : 1,
        }}
      >
        <Ionicons
          name="chevron-back"
          size={26}
          color={theme.colors.textPrimary}
        />
      </Pressable>

      <Box flex={1} alignItems="center">
        <Text variant="h3" numberOfLines={1}>
          {title}
        </Text>
      </Box>

      <Box style={{ width: SIDE_SLOT_WIDTH }} />
    </Box>
  );
}
