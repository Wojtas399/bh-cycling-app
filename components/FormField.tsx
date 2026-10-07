import Box from '@/components/Box';
import Input from '@/components/Input';
import Text from '@/components/Text';

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  error?: string;
};

export default function FormField({
  label,
  error,
  ...inputProps
}: FormFieldProps) {
  return (
    <Box>
      <Text variant="body-s-medium">{label}</Text>
      <Box marginTop="xs">
        <Input placeholder="••••••••" {...inputProps} />
      </Box>
      {error ? (
        <Box marginTop="xs">
          <Text variant="body-xs-regular" color="danger">
            {error}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
