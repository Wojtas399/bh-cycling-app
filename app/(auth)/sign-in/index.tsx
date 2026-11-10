import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSignIn } from './useSignIn';
import Box from '@/components/Box';
import Button from '@/components/Button';
import FormTextField from '@/components/FormTextField';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
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
    signInWithGoogle,
  } = useSignIn();

  return (
    <Box flex={1} backgroundColor="bgPrimary">
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
            <Image
              source={require('@/assets/images/horse-mark.png')}
              style={{ width: 136, height: 136 }}
            />

            <Box marginTop="md">
              <Text variant="body-l-semibold">BH Cycling</Text>
            </Box>

            <SheenSurface
              width="100%"
              marginTop="xl"
              padding="lg"
              alignItems="center"
            >
              <Text variant="h2">{t('signIn.title')}</Text>

              <Box width="100%" marginTop="xl">
                <FormTextField
                  form={form}
                  name="email"
                  next="password"
                  label={t('signIn.email')}
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
                    label={t('signIn.password')}
                    password
                    textContentType="password"
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                </Box>
              </Box>

              <Box width="100%" alignItems="flex-end" marginTop="xl">
                <TouchableOpacity
                  onPress={() => router.push('/forgot-password')}
                  hitSlop={8}
                >
                  <Text variant="body-xs-medium" color="textSecondary">
                    {t('signIn.forgotPassword')}
                  </Text>
                </TouchableOpacity>
              </Box>

              <Box width="100%" marginTop="xl">
                <Button
                  variant="primary"
                  placement="content"
                  onPress={submit}
                  disabled={busy}
                >
                  {emailPending ? (
                    <ActivityIndicator color={theme.colors.textInverse} />
                  ) : (
                    <Text variant="body-l-semibold" color="textInverse">
                      {t('signIn.signInButton')}
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

              <Box
                width="100%"
                flexDirection="row"
                alignItems="center"
                marginTop="xl"
              >
                <Box flex={1} height={1} backgroundColor="borderDefault" />
                <Box marginHorizontal="md">
                  <Text variant="body-xs-regular" color="textSecondary">
                    {t('signIn.or')}
                  </Text>
                </Box>
                <Box flex={1} height={1} backgroundColor="borderDefault" />
              </Box>

              <Box width="100%" marginTop="xl">
                <Button
                  variant="secondary"
                  placement="content"
                  onPress={signInWithGoogle}
                  disabled={busy}
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
                        {t('signIn.signInWithGoogle')}
                      </Text>
                    </>
                  )}
                </Button>
              </Box>
            </SheenSurface>

            <Box marginTop="xl">
              <TouchableOpacity onPress={() => router.push('/sign-up')}>
                <Text
                  variant="body-s-regular"
                  color="textSecondary"
                  textAlign="center"
                >
                  {t('signIn.noAccount')}
                </Text>
              </TouchableOpacity>
            </Box>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
