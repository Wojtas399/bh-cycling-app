import Box from '@/components/Box';

export default function SkeletonBar({
  width,
  height,
  marginVertical,
  onPage = false,
}: {
  width: number | `${number}%`;
  height: number;
  marginVertical?: number;
  onPage?: boolean;
}) {
  return (
    <Box
      backgroundColor={onPage ? 'bgTertiary' : 'insetFill'}
      borderRadius="sm"
      style={{ width, height, marginVertical }}
    />
  );
}
