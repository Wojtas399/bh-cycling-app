import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useForgotPassword } from './useForgotPassword';
import Box from '@/components/Box';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    email,
    emailError,
    error,
    loading,
    success,
    cooldown,
    disabled,
    onEmailChange,
    handleSend,
    handleResend,
    handleBackToSignIn,
  } = useForgotPassword();

  function renderResendLabel() {
    const base = t('forgotPassword.success.resendButton');

    return cooldown > 0 ? `${base} (${cooldown}s)` : base;
  }

  function renderSuccessContent() {
    return (
      <>
        <Ionicons
          name="checkmark-circle-outline"
          size={64}
          color={theme.colors.success}
        />

        <Box marginTop="xl">
          <Text variant="h2" textAlign="center">
            {t('forgotPassword.success.title')}
          </Text>
        </Box>

        <Box marginTop="sm">
          <Text
            variant="body-s-regular"
            color="textSecondary"
            textAlign="center"
          >
            {t('forgotPassword.success.subtitle', { email })}
          </Text>
        </Box>

        {error && (
          <Box width="100%" marginTop="xl">
            <Text variant="body-s-regular" color="danger" textAlign="center">
              {error}
            </Text>
          </Box>
        )}

        <Box width="100%" marginTop="xl">
          <Button
            variant="secondary"
            opacity={disabled || cooldown > 0 ? 0.6 : 1}
            onPress={handleResend}
            disabled={disabled || cooldown > 0}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <Text variant="body-s-medium" color="textPrimary">
                {renderResendLabel()}
              </Text>
            )}
          </Button>
        </Box>

        <Box marginTop="xl">
          <TouchableOpacity onPress={handleBackToSignIn}>
            <Text
              variant="body-s-regular"
              color="textSecondary"
              textAlign="center"
            >
              {t('forgotPassword.success.backToSignIn')}
            </Text>
          </TouchableOpacity>
        </Box>
      </>
    );
  }

  function renderFormContent() {
    return (
      <>
        <Text variant="h2" textAlign="center">
          {t('forgotPassword.title')}
        </Text>

        <Box marginTop="sm">
          <Text
            variant="body-s-regular"
            color="textSecondary"
            textAlign="center"
          >
            {t('forgotPassword.subtitle')}
          </Text>
        </Box>

        <Box width="100%" marginTop="xl">
          <Text variant="body-s-medium">{t('forgotPassword.email')}</Text>
          <Box marginTop="xs">
            <Input
              placeholder="you@example.com"
              value={email}
              onChangeText={onEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
          </Box>
          {emailError && (
            <Box marginTop="xs">
              <Text variant="body-xs-regular" color="danger">
                {emailError}
              </Text>
            </Box>
          )}
        </Box>

        {error && (
          <Box width="100%" marginTop="xl">
            <Text variant="body-s-regular" color="danger" textAlign="center">
              {error}
            </Text>
          </Box>
        )}

        <Box width="100%" marginTop="xl">
          <Button
            variant="primary"
            opacity={disabled ? 0.6 : 1}
            onPress={handleSend}
            disabled={disabled}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text variant="body-l-semibold" color="textInverse">
                {t('forgotPassword.sendButton')}
              </Text>
            )}
          </Button>
        </Box>

        <Box marginTop="xl">
          <TouchableOpacity onPress={handleBackToSignIn}>
            <Text
              variant="body-s-regular"
              color="textSecondary"
              textAlign="center"
            >
              {t('forgotPassword.rememberPassword')}
            </Text>
          </TouchableOpacity>
        </Box>
      </>
    );
  }

  return (
    <Box flex={1} backgroundColor="bgSecondary">
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: insets.top + 16,
          left: 16,
          zIndex: 10,
        }}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={theme.colors.textPrimary}
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Box
            flex={1}
            backgroundColor="bgSecondary"
            alignItems="center"
            justifyContent="center"
            paddingHorizontal="lg"
          >
            {success ? renderSuccessContent() : renderFormContent()}
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
