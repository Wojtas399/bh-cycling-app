import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeleteAccount } from './useDeleteAccount';
import Box from '@/components/Box';
import Button from '@/components/Button';
import FormField from '@/components/FormField';
import ScreenHeader from '@/components/ScreenHeader';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useNavigation } from 'expo-router';

export default function DeleteAccountScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'deleteAccount' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const {
    password,
    passwordError,
    error,
    loading,
    requiresPassword,
    onPasswordChange,
    handleDelete,
  } = useDeleteAccount();

  // Going back is blocked while the request runs: swipe gesture, hardware
  // back button and the header button.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });

    return navigation.addListener('beforeRemove', event => {
      // Only back navigation is blocked: the auth gate must still be able to
      // replace this screen with sign-in once the account is deleted.
      const { type } = event.data.action;

      if (loading && (type === 'GO_BACK' || type === 'POP')) {
        event.preventDefault();
      }
    });
  }, [navigation, loading]);

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScreenHeader title={t('title')} backDisabled={loading} />

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
          <Text variant="h3">{t('warningTitle')}</Text>

          <Box marginTop="md" gap="sm">
            <Text variant="body-s-regular" color="textSecondary">
              {t('consequences.data')}
            </Text>
            <Text variant="body-s-regular" color="textSecondary">
              {t('consequences.intervals')}
            </Text>
            <Text variant="body-s-regular" color="textSecondary">
              {t('consequences.irreversible')}
            </Text>
          </Box>

          <Box marginTop="xl">
            {requiresPassword ? (
              <FormField
                label={t('password')}
                value={password}
                onChangeText={onPasswordChange}
                error={passwordError}
                editable={!loading}
                secureTextEntry
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleDelete}
              />
            ) : (
              <Text variant="body-s-regular" color="textSecondary">
                {t('googleHint')}
              </Text>
            )}
          </Box>

          <Box marginTop="xl">
            <Button
              backgroundColor="danger"
              opacity={loading ? 0.6 : 1}
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text variant="body-l-semibold">{t('deleteButton')}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
