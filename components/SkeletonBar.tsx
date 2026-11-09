import Box from '@/components/Box';

/**
 * A static skeleton bar, sized to a line of text. Inside a Sheen card it is
 * the faint `insetFill`; a bar straight on the page (`onPage`) is `bgTertiary`.
 */
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
