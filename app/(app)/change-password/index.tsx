import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChangePassword } from './useChangePassword';
import Box from '@/components/Box';
import Button from '@/components/Button';
import FormTextField from '@/components/FormTextField';
import ScreenHeader from '@/components/ScreenHeader';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useGlassHeader } from '@/hooks/useGlassHeader';

export default function ChangePasswordScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'changePassword' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const header = useGlassHeader('pushed');

  const { form, formError, busy, submit, forgotPassword } = useChangePassword();

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          {...header.scrollViewProps}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingTop: header.scrollInsetTop + theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <FormTextField
            form={form}
            name="currentPassword"
            next="newPassword"
            label={t('currentPassword')}
            password
            textContentType="password"
            autoComplete="current-password"
          />

          <Box marginTop="md">
            <FormTextField
              form={form}
              name="newPassword"
              next="confirmPassword"
              label={t('newPassword')}
              password
              textContentType="newPassword"
              autoComplete="new-password"
            />
          </Box>

          <Box marginTop="md">
            <FormTextField
              form={form}
              name="confirmPassword"
              label={t('confirmPassword')}
              password
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </Box>

          <Box marginTop="xl">
            <Button
              variant="primary"
              opacity={busy ? 0.6 : 1}
              onPress={submit}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text variant="body-l-semibold" color="textInverse">
                  {t('submitButton')}
                </Text>
              )}
            </Button>
            {formError ? (
              <Box marginTop="sm">
                <Text
                  variant="body-s-regular"
                  color="danger"
                  textAlign="center"
                >
                  {formError}
                </Text>
              </Box>
            ) : null}
          </Box>

          <Box alignItems="center" marginTop="xl">
            <TouchableOpacity
              onPress={forgotPassword}
              disabled={busy}
              hitSlop={8}
            >
              <Text variant="body-s-regular" color="textSecondary">
                {t('forgotPassword')}
              </Text>
            </TouchableOpacity>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>

      <ScreenHeader title={t('title')} onLayout={header.onLayout} />
    </Box>
  );
}
