import Box from '@/components/Box';
import Button from '@/components/Button';
import Text from '@/components/Text';

export interface MessageWithActionProps {
  title?: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

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
      <Button variant="secondary" placement="content" onPress={onAction}>
        <Text variant="body-l-semibold">{actionLabel}</Text>
      </Button>
    </Box>
  );
}
