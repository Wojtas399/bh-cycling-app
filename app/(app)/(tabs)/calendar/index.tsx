import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      alignItems="center"
      justifyContent="center"
      style={{ paddingTop: insets.top }}
    >
      <Text variant="h2">Kalendarz</Text>
    </Box>
  );
}
