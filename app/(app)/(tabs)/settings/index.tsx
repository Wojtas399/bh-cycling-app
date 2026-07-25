import { useTranslation } from 'react-i18next';
import { ActivityIndicator, TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Button from '@/components/Button';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { auth } from '@/lib/firebase';

export default function SettingsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'intervals' });
  const theme = useAppTheme();
  const connection = useIntervalsConnection();
  const { handleConnect, handleDisconnect, connecting, disconnecting, error } =
    useIntervalsAuth();

  const busy = connecting || disconnecting;

  return (
    <Box
      flex={1}
      backgroundColor="bgPrimary"
      alignItems="center"
      justifyContent="center"
    >
      <Text variant="h2">Ustawienia</Text>

      <Box
        width="100%"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="lg"
        marginTop="xl"
      >
        <Box flex={1} marginRight="md">
          <Text variant="body-l-regular">{t('title')}</Text>
          {connection.isConnected ? (
            <Text variant="body-s-regular" color="textSecondary">
              {t('connectedAs', {
                name: connection.athleteName ?? '',
              })}
            </Text>
          ) : null}
        </Box>

        <TouchableOpacity
          onPress={connection.isConnected ? handleDisconnect : handleConnect}
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
                ? t('disconnectButton')
                : t('connectButton')}
            </Text>
          )}
        </TouchableOpacity>
      </Box>

      {error ? (
        <Box marginTop="sm" paddingHorizontal="lg">
          <Text variant="body-s-regular" color="danger" textAlign="center">
            {error}
          </Text>
        </Box>
      ) : null}

      <Button onPress={() => auth().signOut()} marginTop="md">
        <Text variant="body-l-semibold">Log out</Text>
      </Button>
    </Box>
  );
}
