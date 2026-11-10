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
import FormTextField from '@/components/FormTextField';
import ScreenHeader from '@/components/ScreenHeader';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function DeleteAccountScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'deleteAccount' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const { form, formError, busy, requiresPassword, submit } =
    useDeleteAccount();

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScreenHeader title={t('title')} backDisabled={busy} />

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
              <FormTextField
                form={form}
                name="password"
                label={t('password')}
                password
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            ) : (
              <Text variant="body-s-regular" color="textSecondary">
                {t('googleHint')}
              </Text>
            )}
          </Box>

          <Box marginTop="xl">
            <Button
              variant="secondary"
              placement="chrome"
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <>
                  {/* Red on the icon only: a red label fails AA on Frost. */}
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.colors.danger}
                  />
                  <Text variant="body-l-semibold">{t('deleteButton')}</Text>
                </>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
