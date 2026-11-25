import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import MessageWithAction from '@/components/MessageWithAction';
import theme from '@/constants/theme';
import { reportOnFirstLayout } from '@/lib/renderErrorReport';
import { ThemeProvider } from '@shopify/restyle';
import { StatusBar } from 'expo-status-bar';

export default function RenderErrorFallback({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'renderError' });
  const reportWhenShown = useMemo(() => reportOnFirstLayout(error), [error]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        flex={1}
        justifyContent="center"
        backgroundColor="bgPrimary"
        onLayout={reportWhenShown}
      >
        <MessageWithAction
          title={t('title')}
          message={t('body')}
          actionLabel={t('retry')}
          onAction={onRetry}
        />
      </Box>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
