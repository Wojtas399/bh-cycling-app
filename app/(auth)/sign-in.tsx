import { useState } from 'react';
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
import Input from '@/components/Input';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    email,
    password,
    emailError,
    passwordError,
    error,
    loading,
    googleLoading,
    disabled,
    passwordRef,
    onEmailChange,
    onPasswordChange,
    handleSignIn,
    handleGoogleSignIn,
  } = useSignIn();

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
            <Image
              source={require('@/assets/images/bhc_logo.jpg')}
              style={{
                width: 136,
                height: 136,
                borderRadius: 68,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            />

            <Box marginTop="xl">
              <Text variant="h2">{t('signIn.title')}</Text>
            </Box>

            <Box width="100%" marginTop="xl">
              <Text variant="body-s-medium">{t('signIn.email')}</Text>
              <Box marginTop="xs">
                <Input
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={onEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
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
                <Text variant="body-s-medium">{t('signIn.password')}</Text>
                <Box marginTop="xs">
                  <Input
                    ref={passwordRef}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={onPasswordChange}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
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
            </Box>

            <Box width="100%" alignItems="flex-end" marginTop="xl">
              <Text variant="body-xs-medium" color="textSecondary">
                {t('signIn.forgotPassword')}
              </Text>
            </Box>

            <Box width="100%" marginTop="xl">
              <Button
                variant="primary"
                opacity={disabled ? 0.6 : 1}
                onPress={handleSignIn}
                disabled={disabled}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <Text variant="body-l-semibold" color="textInverse">
                    {t('signIn.signInButton')}
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
                    {t('signIn.signInWithGoogle')}
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
              <Text
                variant="body-s-regular"
                color="textSecondary"
                textAlign="center"
              >
                {t('signIn.noAccount')}
              </Text>
            </Box>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
