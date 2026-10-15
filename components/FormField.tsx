import Box from '@/components/Box';
import Input from '@/components/Input';
import PasswordInput from '@/components/PasswordInput';
import Text from '@/components/Text';

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  password?: boolean;
};

export default function FormField({
  label,
  error,
  password,
  ...inputProps
}: FormFieldProps) {
  return (
    <Box>
      <Text variant="body-s-medium">{label}</Text>
      <Box marginTop="xs">
        {password ? (
          <PasswordInput placeholder="••••••••" {...inputProps} />
        ) : (
          <Input placeholder="••••••••" {...inputProps} />
        )}
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
