import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/constants/legal';
import { useAppTheme } from '@/constants/theme';
import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { formatAppVersion } from '@/lib/appVersion';
import { auth } from '@/lib/firebase';
import { type SignInMethod, getSignInMethods } from '@/lib/signInMethods';
import { signOutAndClear } from '@/lib/signOutAndClear';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const connection = useIntervalsConnection();
  const { handleConnect, handleDisconnect, connecting, disconnecting, error } =
    useIntervalsAuth();

  const user = auth().currentUser;
  const signInMethods = getSignInMethods(user);
  const signInMethodLabelKey = getSignInMethodLabelKey(signInMethods);
  const appVersion = formatAppVersion(
    Constants.expoConfig?.version,
    Constants.expoConfig?.extra?.appEnv,
  );
  const busy = connecting || disconnecting;

  function handleLogOut() {
    Alert.alert(t('logout.confirmTitle'), t('logout.confirmBody'), [
      { text: t('logout.cancelButton'), style: 'cancel' },
      {
        text: t('logout.confirmButton'),
        style: 'destructive',
        onPress: signOutAndClear,
      },
    ]);
  }

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
        {signInMethods.includes('email') ? (
          <SettingsRow
            icon="lock-closed-outline"
            iconColor="neutral"
            label={t('account.changePassword')}
            trailing="chevron"
            onPress={() => router.push('/change-password')}
          />
        ) : null}
        <SettingsRow
          icon="trash-outline"
          iconColor="danger"
          label={t('account.deleteAccount')}
          danger
          onPress={() => router.push('/delete-account')}
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

      <SettingsSection title={t('about.title')}>
        <SettingsRow
          icon="information-circle-outline"
          iconColor="neutral"
          label={t('about.version')}
          value={appVersion}
        />
        <SettingsRow
          icon="document-text-outline"
          iconColor="neutral"
          label={t('about.privacyPolicy')}
          trailing="external"
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
        />
        <SettingsRow
          icon="document-text-outline"
          iconColor="neutral"
          label={t('about.termsOfService')}
          trailing="external"
          onPress={() => WebBrowser.openBrowserAsync(TERMS_OF_SERVICE_URL)}
        />
      </SettingsSection>

      <Box marginTop="xl">
        <SettingsSection>
          <SettingsRow
            icon="log-out-outline"
            iconColor="danger"
            label={t('logout.label')}
            danger
            onPress={handleLogOut}
          />
        </SettingsSection>
      </Box>
    </ScrollView>
  );
}
