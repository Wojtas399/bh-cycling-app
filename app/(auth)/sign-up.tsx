import { useState } from 'react';
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
import Input from '@/components/Input';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const {
    email,
    password,
    confirmPassword,
    emailError,
    passwordError,
    confirmPasswordError,
    error,
    loading,
    googleLoading,
    disabled,
    onEmailChange,
    onPasswordChange,
    onConfirmPasswordChange,
    handleSignUp,
    handleGoogleSignIn,
  } = useSignUp();

  return (
    <Box flex={1} backgroundColor="bgSecondary">
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
              <Text variant="body-s-medium">{t('signUp.email')}</Text>
              <Box marginTop="xs">
                <Input
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={onEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </Box>
              {emailError ? (
                <Box marginTop="xs">
                  <Text variant="body-xs-regular" color="danger">
                    {emailError}
                  </Text>
                </Box>
              ) : null}

              <Box marginTop="md">
                <Text variant="body-s-medium">{t('signUp.password')}</Text>
                <Box marginTop="xs">
                  <Input
                    placeholder="••••••••"
                    value={password}
                    onChangeText={onPasswordChange}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="next"
                    rightElement={
                      <TouchableOpacity
                        onPress={() => setPasswordVisible(v => !v)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={passwordVisible ? 'eye-off' : 'eye'}
                          size={20}
                          color={theme.colors.textTertiary}
                        />
                      </TouchableOpacity>
                    }
                  />
                </Box>
                {passwordError ? (
                  <Box marginTop="xs">
                    <Text variant="body-xs-regular" color="danger">
                      {passwordError}
                    </Text>
                  </Box>
                ) : null}
              </Box>

              <Box marginTop="md">
                <Text variant="body-s-medium">
                  {t('signUp.confirmPassword')}
                </Text>
                <Box marginTop="xs">
                  <Input
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={onConfirmPasswordChange}
                    secureTextEntry={!confirmPasswordVisible}
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    rightElement={
                      <TouchableOpacity
                        onPress={() => setConfirmPasswordVisible(v => !v)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={confirmPasswordVisible ? 'eye-off' : 'eye'}
                          size={20}
                          color={theme.colors.textTertiary}
                        />
                      </TouchableOpacity>
                    }
                  />
                </Box>
                {confirmPasswordError ? (
                  <Box marginTop="xs">
                    <Text variant="body-xs-regular" color="danger">
                      {confirmPasswordError}
                    </Text>
                  </Box>
                ) : null}
              </Box>
            </Box>

            {error ? (
              <Box width="100%" marginTop="xl">
                <Text
                  variant="body-s-regular"
                  color="danger"
                  textAlign="center"
                >
                  {error}
                </Text>
              </Box>
            ) : null}

            <Box width="100%" marginTop="xl">
              <Button
                variant="primary"
                opacity={disabled ? 0.6 : 1}
                onPress={handleSignUp}
                disabled={disabled}
                activeOpacity={0.8}
              >
                {loading ? (
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
              opacity={disabled ? 0.6 : 1}
              onPress={handleGoogleSignIn}
              disabled={disabled}
              activeOpacity={0.8}
            >
              {googleLoading ? (
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
              <TouchableOpacity onPress={() => router.back()}>
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
