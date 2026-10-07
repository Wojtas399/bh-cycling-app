import { ActivityIndicator, Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type IconColor = Extract<
  keyof AppTheme['colors'],
  'accent' | 'success' | 'danger' | 'neutral'
>;
type BuiltInTrailing = 'chevron' | 'external' | 'none';

interface SettingsRowProps {
  icon: IconName;
  iconColor: IconColor;
  label: string;
  subtitle?: string;
  value?: string;
  trailing?: BuiltInTrailing | React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  loading?: boolean;
}

export default function SettingsRow({
  icon,
  iconColor,
  label,
  subtitle,
  value,
  trailing = 'none',
  onPress,
  danger,
  loading,
}: SettingsRowProps) {
  const theme = useAppTheme();

  function renderTrailing() {
    if (loading) {
      return (
        <ActivityIndicator
          testID="settings-row-loading"
          color={theme.colors.textPrimary}
        />
      );
    }

    if (trailing === 'chevron' && !danger) {
      return (
        <Ionicons
          testID="settings-row-chevron"
          name="chevron-forward"
          size={18}
          color={theme.colors.textTertiary}
        />
      );
    }

    if (trailing === 'external') {
      return (
        <Ionicons
          testID="settings-row-external"
          name="open-outline"
          size={18}
          color={theme.colors.textTertiary}
        />
      );
    }

    if (trailing === 'chevron' || trailing === 'none') return null;

    return trailing;
  }

  function renderContent(pressed: boolean) {
    const trailingContent = renderTrailing();

    return (
      <Box
        flexDirection="row"
        alignItems="center"
        paddingVertical="md"
        paddingHorizontal="base"
        backgroundColor={pressed ? 'bgTertiary' : undefined}
        style={{ minHeight: 44 }}
      >
        <Box
          width={28}
          height={28}
          borderRadius="md"
          alignItems="center"
          justifyContent="center"
          marginRight="md"
          backgroundColor={iconColor}
        >
          <Ionicons name={icon} size={16} color={theme.colors.white} />
        </Box>

        <Box
          flex={value ? undefined : 1}
          style={value ? { flexShrink: 0 } : undefined}
        >
          <Text
            variant="body-l-regular"
            color={danger ? 'danger' : 'textPrimary'}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text variant="body-s-regular" color="textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </Box>

        {value ? (
          <Text
            variant="body-s-regular"
            color="textSecondary"
            numberOfLines={1}
            ellipsizeMode="tail"
            marginLeft="md"
            style={{ flex: 1, textAlign: 'right' }}
          >
            {value}
          </Text>
        ) : null}

        {trailingContent ? <Box marginLeft="sm">{trailingContent}</Box> : null}
      </Box>
    );
  }

  if (!onPress) return renderContent(false);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => renderContent(pressed)}
    </Pressable>
  );
}
