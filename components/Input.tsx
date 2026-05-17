import { forwardRef } from 'react';
import {
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAppTheme } from '@/constants/theme';

type InputProps = TextInputProps & {
  rightElement?: React.ReactNode;
};

const Input = forwardRef<TextInput, InputProps>(
  ({ rightElement, ...props }, ref) => {
    const theme = useAppTheme();

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
          borderWidth: 1,
          borderRadius: theme.borderRadii.sm,
          backgroundColor: theme.colors.bgTertiary,
          borderColor: theme.colors.borderStrong,
        }}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textTertiary}
          {...props}
          style={[
            {
              flex: 1,
              paddingHorizontal: theme.spacing.base,
              fontSize: 16,
              fontFamily: 'Inter-Regular',
              color: theme.colors.textPrimary,
            },
            props.style,
          ]}
        />
        {rightElement ? (
          <View style={{ paddingRight: theme.spacing.base }}>
            {rightElement}
          </View>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

export default Input;
