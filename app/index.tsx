import Box from '@/components/Box';

/** Shown until the auth state is known; the root guards then move on. */
export default function RootIndex() {
  return <Box flex={1} backgroundColor="bgPrimary" />;
}
