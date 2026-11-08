import Box from '@/components/Box';

/** A static skeleton bar, sized to a line of text. */
export default function SkeletonBar({
  width,
  height,
  marginVertical,
}: {
  width: number;
  height: number;
  marginVertical: number;
}) {
  return (
    <Box
      backgroundColor="bgTertiary"
      borderRadius="sm"
      style={{ width, height, marginVertical }}
    />
  );
}
