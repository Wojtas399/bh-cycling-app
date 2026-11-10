import { forwardRef } from 'react';
import { TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { useAppTheme } from '@/constants/theme';

/** Nearly see-through, so a field reads as a place to type, not a button. */
const FILL = 'rgba(255, 255, 255, 0.03)';

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
          borderRadius: theme.borderRadii.lg,
          backgroundColor: FILL,
          borderColor: theme.colors.hairline,
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
