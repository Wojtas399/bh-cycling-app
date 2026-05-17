import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { GoogleSignin, auth } from '@/lib/firebase';
import { AntDesign } from '@expo/vector-icons';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Nieprawidłowy e-mail lub hasło.';
    case 'auth/invalid-email':
      return 'Podaj prawidłowy adres e-mail.';
    case 'auth/too-many-requests':
      return 'Za dużo prób logowania. Spróbuj ponownie później.';
    case 'auth/network-request-failed':
      return 'Brak połączenia z internetem.';
    default:
      return 'Wystąpił błąd. Spróbuj ponownie.';
  }
}

export default function SignInScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(): string {
    if (!email.trim()) return 'Podaj adres e-mail.';

    if (!EMAIL_REGEX.test(email.trim()))
      return 'Podaj prawidłowy adres e-mail.';

    if (!password) return 'Podaj hasło.';

    return '';
  }

  async function handleSignIn() {
    const validationError = validate();

    if (validationError) {
      setError(validationError);

      return;
    }

    setError('');
    setLoading(true);

    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
    } catch (e: any) {
      setError(getFirebaseErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;

      if (!idToken) throw new Error('no_id_token');

      const credential = auth.GoogleAuthProvider.credential(idToken);

      await auth().signInWithCredential(credential);
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)
        return;

      setError('Logowanie przez Google nie powiodło się.');
    } finally {
      setGoogleLoading(false);
    }
  }

  const disabled = loading || googleLoading;

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
            paddingHorizontal="base"
          >
            <Box
              backgroundColor="bgTertiary"
              paddingHorizontal="lg"
              paddingVertical="3xl"
              width="100%"
              borderRadius="2xl"
              alignItems="center"
              shadowColor="black"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.4}
              shadowRadius={16}
              elevation={8}
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
                <Text variant="h2">Zaloguj się</Text>
              </Box>

              <Box width="100%" marginTop="xl">
                <Text variant="body-s-medium">E-mail</Text>
                <Box marginTop="xs">
                  <Input
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </Box>
                <Box marginTop="md">
                  <Text variant="body-s-medium">Hasło</Text>
                  <Box marginTop="xs">
                    <Input
                      ref={passwordRef}
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleSignIn}
                    />
                  </Box>
                </Box>
              </Box>

              <Box width="100%" alignItems="flex-end" marginTop="xl">
                <Text variant="body-xs-medium" color="textSecondary">
                  Zapomniałeś hasła?
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
                      Zaloguj się
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
                    lub
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
                    <AntDesign
                      name="google"
                      size={20}
                      color={theme.colors.textPrimary}
                    />
                    <Text variant="body-s-medium" color="textPrimary">
                      Zaloguj się przez Google
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
                  Nie masz konta? Zarejestruj się
                </Text>
              </Box>
            </Box>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
