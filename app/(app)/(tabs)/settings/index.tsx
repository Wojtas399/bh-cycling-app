import Box from '@/components/Box';
import Button from '@/components/Button';
import Text from '@/components/Text';
import { auth } from '@/lib/firebase';

export default function SettingsScreen() {
  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      alignItems="center"
      justifyContent="center"
    >
      <Text variant="h2">Ustawienia</Text>
      <Button onPress={() => auth().signOut()} marginTop="md">
        <Text variant="body-l-semibold">Log out</Text>
      </Button>
    </Box>
  );
}
