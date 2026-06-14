import Box from '@/components/Box';
import Text from '@/components/Text';

export default function HomeScreen() {
  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      alignItems="center"
      justifyContent="center"
    >
      <Text variant="h2">Home</Text>
    </Box>
  );
}
