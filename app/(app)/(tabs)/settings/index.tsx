import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Button from '@/components/Button';
import Text from '@/components/Text';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import { useAppTheme } from '@/constants/theme';
import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { auth } from '@/lib/firebase';
import { type SignInMethod, getSignInMethods } from '@/lib/signInMethods';

function getSignInMethodLabelKey(methods: SignInMethod[]) {
  if (methods.includes('email') && methods.includes('google')) {
    return 'emailAndGoogle';
  }

  if (methods.includes('email')) return 'email';

  if (methods.includes('google')) return 'google';

  return null;
}

export default function SettingsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'settings' });
  const { t: tIntervals } = useTranslation(undefined, {
    keyPrefix: 'intervals',
  });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const connection = useIntervalsConnection();
  const { handleConnect, handleDisconnect, connecting, disconnecting, error } =
    useIntervalsAuth();

  const user = auth().currentUser;
  const signInMethodLabelKey = getSignInMethodLabelKey(getSignInMethods(user));
  const busy = connecting || disconnecting;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: theme.spacing['2xl'],
      }}
    >
      <Text variant="h2" marginLeft="base">
        {t('title')}
      </Text>

      <SettingsSection title={t('account.title')}>
        <SettingsRow
          icon="mail-outline"
          iconColor="accent"
          label={t('account.email')}
          value={user?.email ?? ''}
        />
        <SettingsRow
          icon="key-outline"
          iconColor="neutral"
          label={t('account.signInMethod')}
          value={
            signInMethodLabelKey
              ? t(`account.signInMethods.${signInMethodLabelKey}`)
              : ''
          }
        />
      </SettingsSection>

      <SettingsSection
        title={t('integrations.title')}
        footer={error || undefined}
        footerColor="danger"
      >
        <SettingsRow
          icon="link-outline"
          iconColor="success"
          label={tIntervals('title')}
          subtitle={
            connection.isConnected
              ? tIntervals('connectedAs', {
                  name: connection.athleteName ?? '',
                })
              : undefined
          }
          trailing={
            <TouchableOpacity
              onPress={
                connection.isConnected ? handleDisconnect : handleConnect
              }
              disabled={busy || connection.loading}
              hitSlop={8}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <Text
                  variant="body-s-medium"
                  color={connection.isConnected ? 'danger' : 'accent'}
                >
                  {connection.isConnected
                    ? tIntervals('disconnectButton')
                    : tIntervals('connectButton')}
                </Text>
              )}
            </TouchableOpacity>
          }
        />
      </SettingsSection>

      <Box marginHorizontal="base" marginTop="lg">
        <Button onPress={() => auth().signOut()}>
          <Text variant="body-l-semibold">Log out</Text>
        </Button>
      </Box>
    </ScrollView>
  );
}
