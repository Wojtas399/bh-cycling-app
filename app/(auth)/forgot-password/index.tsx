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
import FormTextField from '@/components/FormTextField';
import SheenSurface from '@/components/SheenSurface';
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
    form,
    formError,
    busy,
    submit,
    resend,
    backToSignIn,
    success,
    sentEmail,
    cooldown,
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

        <SheenSurface
          width="100%"
          marginTop="xl"
          padding="lg"
          alignItems="center"
        >
          <Text variant="h2" textAlign="center">
            {t('forgotPassword.success.title')}
          </Text>

          <Box marginTop="sm">
            <Text
              variant="body-s-regular"
              color="textSecondary"
              textAlign="center"
            >
              {t('forgotPassword.success.subtitle', { email: sentEmail ?? '' })}
            </Text>
          </Box>

          {formError ? (
            <Box width="100%" marginTop="xl">
              <Text variant="body-s-regular" color="danger" textAlign="center">
                {formError}
              </Text>
            </Box>
          ) : null}

          <Box width="100%" marginTop="xl">
            <Button
              variant="secondary"
              placement="content"
              onPress={resend}
              disabled={busy || cooldown > 0}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <Text variant="body-s-medium" color="textPrimary">
                  {renderResendLabel()}
                </Text>
              )}
            </Button>
          </Box>
        </SheenSurface>

        <Box marginTop="xl">
          <TouchableOpacity onPress={backToSignIn}>
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
        <SheenSurface width="100%" padding="lg" alignItems="center">
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
            <FormTextField
              form={form}
              name="email"
              label={t('forgotPassword.email')}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </Box>

          {formError ? (
            <Box width="100%" marginTop="xl">
              <Text variant="body-s-regular" color="danger" textAlign="center">
                {formError}
              </Text>
            </Box>
          ) : null}

          <Box width="100%" marginTop="xl">
            <Button
              variant="primary"
              placement="content"
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text variant="body-l-semibold" color="textInverse">
                  {t('forgotPassword.sendButton')}
                </Text>
              )}
            </Button>
          </Box>
        </SheenSurface>

        <Box marginTop="xl">
          <TouchableOpacity onPress={backToSignIn}>
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
    <Box flex={1} backgroundColor="bgPrimary">
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
