import Box from '@/components/Box';
import Button from '@/components/Button';
import Text from '@/components/Text';

export interface MessageWithActionProps {
  /** Optional heading above the message. */
  title?: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/**
 * A centred message with one secondary button below it, for a screen that has
 * nothing to show but a way forward: connect, go back, retry.
 */
export default function MessageWithAction({
  title,
  message,
  actionLabel,
  onAction,
}: MessageWithActionProps) {
  return (
    <Box padding="lg" alignItems="center" gap="base">
      {title !== undefined && (
        <Text variant="h3" textAlign="center">
          {title}
        </Text>
      )}
      <Text variant="body-l-regular" color="textSecondary" textAlign="center">
        {message}
      </Text>
      <Button
        variant="secondary"
        onPress={onAction}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text variant="body-l-semibold">{actionLabel}</Text>
      </Button>
    </Box>
  );
}
