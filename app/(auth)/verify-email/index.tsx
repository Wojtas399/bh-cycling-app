import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVerifyEmail } from './useVerifyEmail';
import Box from '@/components/Box';
import Button from '@/components/Button';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const {
    email,
    loading,
    error,
    cooldown,
    handleVerified,
    handleResend,
    handleSignOut,
  } = useVerifyEmail();

  function renderResendLabel() {
    return cooldown > 0
      ? t('verifyEmail.resendButton', { seconds: cooldown })
      : t('verifyEmail.resendButton', { seconds: '' }).replace(' (s)', '');
  }

  return (
    <Box flex={1} backgroundColor="bgSecondary">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <Box
          flex={1}
          backgroundColor="bgSecondary"
          alignItems="center"
          justifyContent="center"
          paddingHorizontal="lg"
        >
          <Ionicons name="mail-outline" size={64} color={theme.colors.accent} />

          <Box marginTop="xl">
            <Text variant="h2" textAlign="center">
              {t('verifyEmail.title')}
            </Text>
          </Box>

          <Box marginTop="sm">
            <Text
              variant="body-s-regular"
              color="textSecondary"
              textAlign="center"
            >
              {t('verifyEmail.subtitle', { email })}
            </Text>
          </Box>

          {!!error && (
            <Box width="100%" marginTop="xl">
              <Text variant="body-s-regular" color="danger" textAlign="center">
                {error}
              </Text>
            </Box>
          )}

          <Box width="100%" marginTop="xl">
            <Button
              variant="primary"
              placement="content"
              onPress={handleVerified}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text variant="body-l-semibold" color="textInverse">
                  {t('verifyEmail.verifiedButton')}
                </Text>
              )}
            </Button>
          </Box>

          <Box width="100%" marginTop="lg">
            <Button
              variant="secondary"
              placement="content"
              onPress={handleResend}
              disabled={loading || cooldown > 0}
            >
              <Text variant="body-s-medium" color="textPrimary">
                {renderResendLabel()}
              </Text>
            </Button>
          </Box>

          <Box marginTop="xl">
            <TouchableOpacity onPress={handleSignOut}>
              <Text
                variant="body-s-regular"
                color="textSecondary"
                textAlign="center"
              >
                {t('verifyEmail.signOut')}
              </Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
}
