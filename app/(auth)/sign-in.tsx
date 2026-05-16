import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
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
  const passwordRef = useRef<RNTextInput>(null);

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
  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.bgTertiary,
      borderColor: theme.colors.borderStrong,
      color: theme.colors.textPrimary,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: theme.colors.bgSecondary }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
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
            style={styles.card}
            alignItems="center"
          >
            <Image
              source={require('@/assets/images/bhc_logo.jpg')}
              style={styles.logo}
            />

            <Box marginTop="xl">
              <Text variant="h2">Zaloguj się</Text>
            </Box>

            <Box style={styles.fullWidth} marginTop="xl">
              <Text variant="labelDefault">E-mail</Text>
              <Box marginTop="xs">
                <RNTextInput
                  style={inputStyle}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
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
                <Text variant="labelDefault">Hasło</Text>
                <Box marginTop="xs">
                  <RNTextInput
                    ref={passwordRef}
                    style={inputStyle}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                  />
                </Box>
              </Box>
            </Box>

            <Box style={[styles.fullWidth, styles.alignEnd]} marginTop="xl">
              <Text variant="labelSmall" color="textSecondary">
                Zapomniałeś hasła?
              </Text>
            </Box>

            <Box style={styles.fullWidth} marginTop="xl">
              <Pressable
                style={[
                  styles.primaryButton,
                  disabled && styles.buttonDisabled,
                ]}
                onPress={handleSignIn}
                disabled={disabled}
              >
                {loading ? (
                  <ActivityIndicator color="#0A0A0A" />
                ) : (
                  <Text style={styles.primaryButtonText}>Zaloguj się</Text>
                )}
              </Pressable>
              {error ? (
                <Box marginTop="sm">
                  <Text variant="bodySmall" color="danger" textAlign="center">
                    {error}
                  </Text>
                </Box>
              ) : null}
            </Box>

            <Box
              style={styles.fullWidth}
              flexDirection="row"
              alignItems="center"
              marginTop="xl"
            >
              <Box
                flex={1}
                style={styles.dividerLine}
                backgroundColor="borderDefault"
              />
              <Box marginHorizontal="md">
                <Text variant="caption" color="textSecondary">
                  lub
                </Text>
              </Box>
              <Box
                flex={1}
                style={styles.dividerLine}
                backgroundColor="borderDefault"
              />
            </Box>

            <Pressable
              style={[
                styles.googleButton,
                { borderColor: theme.colors.interactiveDefault },
                disabled && styles.buttonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={disabled}
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
                  <Text style={styles.googleButtonText}>
                    Zaloguj się przez Google
                  </Text>
                </>
              )}
            </Pressable>

            <Box
              style={[styles.fullWidth, styles.dividerLine]}
              backgroundColor="borderDefault"
              marginTop="xl"
            />

            <Box marginTop="xl">
              <Text
                variant="bodySmall"
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
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  fullWidth: { width: '100%' },
  alignEnd: { alignItems: 'flex-end' },
  card: {
    width: '100%',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  dividerLine: { height: 1 },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  googleButton: {
    height: 48,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 24,
  },
  googleButtonText: {
    color: '#F2F2F7',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  buttonDisabled: { opacity: 0.6 },
});
