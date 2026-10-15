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
import FormField from '@/components/FormField';
import ScreenHeader from '@/components/ScreenHeader';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';

export default function ChangePasswordScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'changePassword' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const {
    currentPassword,
    newPassword,
    confirmPassword,
    currentPasswordError,
    newPasswordError,
    confirmPasswordError,
    error,
    loading,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    handleSubmit,
    handleForgotPassword,
  } = useChangePassword();

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScreenHeader title={t('title')} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <FormField
            label={t('currentPassword')}
            value={currentPassword}
            onChangeText={onCurrentPasswordChange}
            error={currentPasswordError}
            editable={!loading}
            password
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="next"
          />

          <Box marginTop="md">
            <FormField
              label={t('newPassword')}
              value={newPassword}
              onChangeText={onNewPasswordChange}
              error={newPasswordError}
              editable={!loading}
              password
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="next"
            />
          </Box>

          <Box marginTop="md">
            <FormField
              label={t('confirmPassword')}
              value={confirmPassword}
              onChangeText={onConfirmPasswordChange}
              error={confirmPasswordError}
              editable={!loading}
              password
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </Box>

          <Box marginTop="xl">
            <Button
              variant="primary"
              opacity={loading ? 0.6 : 1}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text variant="body-l-semibold" color="textInverse">
                  {t('submitButton')}
                </Text>
              )}
            </Button>
            {error ? (
              <Box marginTop="sm">
                <Text
                  variant="body-s-regular"
                  color="danger"
                  textAlign="center"
                >
                  {error}
                </Text>
              </Box>
            ) : null}
          </Box>

          <Box alignItems="center" marginTop="xl">
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={loading}
              hitSlop={8}
            >
              <Text variant="body-s-regular" color="textSecondary">
                {t('forgotPassword')}
              </Text>
            </TouchableOpacity>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
