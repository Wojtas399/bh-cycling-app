import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSignUp } from './useSignUp';
import Box from '@/components/Box';
import Button from '@/components/Button';
import FormTextField from '@/components/FormTextField';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    form,
    formError,
    busy,
    emailPending,
    googlePending,
    submit,
    signUpWithGoogle,
  } = useSignUp();

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
            <Text variant="h2">{t('signUp.title')}</Text>

            <Box marginTop="sm">
              <Text
                variant="body-s-regular"
                color="textSecondary"
                textAlign="center"
              >
                {t('signUp.subtitle')}
              </Text>
            </Box>

            <Box width="100%" marginTop="xl">
              <FormTextField
                form={form}
                name="email"
                next="password"
                label={t('signUp.email')}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
              />

              <Box marginTop="md">
                <FormTextField
                  form={form}
                  name="password"
                  next="confirmPassword"
                  label={t('signUp.password')}
                  password
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
              </Box>

              <Box marginTop="md">
                <FormTextField
                  form={form}
                  name="confirmPassword"
                  label={t('signUp.confirmPassword')}
                  password
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={submit}
                />
              </Box>
            </Box>

            {formError ? (
              <Box width="100%" marginTop="xl">
                <Text
                  variant="body-s-regular"
                  color="danger"
                  textAlign="center"
                >
                  {formError}
                </Text>
              </Box>
            ) : null}

            <Box width="100%" marginTop="xl">
              <Button
                variant="primary"
                opacity={busy ? 0.6 : 1}
                onPress={submit}
                disabled={busy}
                activeOpacity={0.8}
              >
                {emailPending ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <Text variant="body-l-semibold" color="textInverse">
                    {t('signUp.signUpButton')}
                  </Text>
                )}
              </Button>
            </Box>

            <Box
              width="100%"
              flexDirection="row"
              alignItems="center"
              marginTop="xl"
            >
              <Box flex={1} height={1} backgroundColor="borderDefault" />
              <Box marginHorizontal="md">
                <Text variant="body-xs-regular" color="textSecondary">
                  {t('signUp.or')}
                </Text>
              </Box>
              <Box flex={1} height={1} backgroundColor="borderDefault" />
            </Box>

            <Button
              variant="secondary"
              marginTop="xl"
              opacity={busy ? 0.6 : 1}
              onPress={signUpWithGoogle}
              disabled={busy}
              activeOpacity={0.8}
            >
              {googlePending ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="logo-google"
                    size={20}
                    color={theme.colors.textPrimary}
                  />
                  <Text variant="body-s-medium" color="textPrimary">
                    {t('signUp.signUpWithGoogle')}
                  </Text>
                </>
              )}
            </Button>

            <Box
              width="100%"
              height={1}
              backgroundColor="borderDefault"
              marginTop="xl"
            />

            <Box marginTop="xl">
              <TouchableOpacity
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace('/sign-in')
                }
              >
                <Text
                  variant="body-s-regular"
                  color="textSecondary"
                  textAlign="center"
                >
                  {t('signUp.hasAccount')}
                </Text>
              </TouchableOpacity>
            </Box>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
