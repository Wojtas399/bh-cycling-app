import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/constants/theme';

const Input = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const theme = useAppTheme();

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={theme.colors.textTertiary}
      {...props}
      style={[
        {
          height: 48,
          borderWidth: 1,
          borderRadius: theme.borderRadii.sm,
          paddingHorizontal: theme.spacing.base,
          fontSize: 16,
          fontFamily: 'Inter-Regular',
          backgroundColor: theme.colors.bgTertiary,
          borderColor: theme.colors.borderStrong,
          color: theme.colors.textPrimary,
        },
        props.style,
      ]}
    />
  );
});

Input.displayName = 'Input';

export default Input;
