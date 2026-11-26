import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Button from '@/components/Button';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import { PRIVACY_POLICY_URL } from '@/constants/legal';
import { useAppTheme } from '@/constants/theme';
import type { HealthDataConsentPrompt as Prompt } from '@/hooks/healthDataConsent';
import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export default function HealthDataConsentPrompt({
  prompt,
}: {
  prompt: Prompt;
}) {
  return prompt === 'needsConsent' ? <ConsentRequest /> : <AuthorizeAgain />;
}

function ConsentRequest() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'intervals.healthDataConsentPrompt',
  });
  const { colors } = useAppTheme();
  const { handleGrantHealthDataConsent, connecting } = useIntervalsAuth();
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  return (
    <SheenSurface padding="base" gap="sm" alignItems="flex-start">
      <Text variant="body-l-semibold">{t('title')}</Text>
      <Text variant="body-s-regular" color="textSecondary">
        {t('whatWeRead')}
      </Text>
      <Text variant="body-s-regular" color="textSecondary">
        {t('notStored')}
      </Text>
      <Text variant="body-s-regular" color="textSecondary">
        {t('withdraw')}
      </Text>
      <TouchableOpacity
        onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
        activeOpacity={0.8}
        hitSlop={8}
        accessibilityRole="link"
      >
        <Text variant="body-s-medium" color="accent">
          {t('privacyPolicy')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setAgeConfirmed(confirmed => !confirmed)}
        activeOpacity={0.8}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ageConfirmed }}
      >
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Ionicons
            name={ageConfirmed ? 'checkbox' : 'square-outline'}
            size={20}
            color={ageConfirmed ? colors.accent : colors.textSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text variant="body-s-regular">{t('ageStatement')}</Text>
        </Box>
      </TouchableOpacity>
      <Button
        variant="primary"
        placement="content"
        disabled={!ageConfirmed || connecting}
        onPress={handleGrantHealthDataConsent}
      >
        <Text variant="body-l-semibold">{t('agree')}</Text>
      </Button>
    </SheenSurface>
  );
}

function AuthorizeAgain() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'intervals.healthDataReauthorizationPrompt',
  });
  const { handleConnect, connecting } = useIntervalsAuth();

  return (
    <SheenSurface padding="base" gap="sm" alignItems="flex-start">
      <Text variant="body-s-regular" color="textSecondary">
        {t('message')}
      </Text>
      <TouchableOpacity
        onPress={handleConnect}
        disabled={connecting}
        activeOpacity={0.8}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Text variant="body-s-medium" color="accent">
          {t('action')}
        </Text>
      </TouchableOpacity>
    </SheenSurface>
  );
}
