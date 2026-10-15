import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';
import type { TextInput } from 'react-native';

import Input from '@/components/Input';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'secureTextEntry' | 'rightElement'
>;

const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  (props, ref) => {
    const { t } = useTranslation();
    const theme = useAppTheme();
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        {...props}
        secureTextEntry={!visible}
        rightElement={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              visible ? t('common.hidePassword') : t('common.showPassword')
            }
            onPress={() => setVisible(v => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={visible ? 'eye-off' : 'eye'}
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        }
      />
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
