import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
            paddingHorizontal="lg"
          >
            <Text variant="h2">{t('signUp.title')}</Text>

            <Box marginTop="sm">
              <Text
                variant="body-s-regular"
                color="textSecondary"
                textAlign="center"
              >
                {t('signUp.subtitle')}
              </Text>
            </Box>
          </Box>

          <Box alignItems="center" paddingBottom="md">
            <TouchableOpacity onPress={() => router.back()}>
              <Text
                variant="body-s-regular"
                color="textSecondary"
                textAlign="center"
              >
                {t('signUp.hasAccount')}
              </Text>
            </TouchableOpacity>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
